const HEALTH_STATES = new Set(['no_evidence', 'on_track', 'at_risk', 'behind', 'completed'])
const HEALTH_LABELS = {
  no_evidence: 'No Evidence',
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
  completed: 'Completed',
}
const HEALTH_REASONS = {
  no_evidence: 'There is not enough activity yet to assess this goal.',
  completed: 'All roadmap work is complete.',
}

function dateDifferenceInDays(earlier, later) {
  return Math.round((Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) / 86400000)
}

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function getRecentCompletionRate(taskRows, today) {
  const windowStart = new Date(`${today}T00:00:00.000Z`)
  windowStart.setUTCDate(windowStart.getUTCDate() - 29)
  const recentTasks = taskRows.filter((task) => {
    const created = task.created_at ? new Date(task.created_at) : null
    return created && created >= windowStart
  })
  if (!recentTasks.length) return 0
  const completed = recentTasks.filter((task) => task.status === 'completed' && task.completed_at).length
  return Math.round((completed / recentTasks.length) * 100) / 100
}

function getExecutionTrend(taskRows, today) {
  const makeWindow = (daysAgo) => {
    const end = new Date(`${today}T00:00:00.000Z`)
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - daysAgo)
    return { end, start }
  }
  const recent = makeWindow(14)
  const previous = makeWindow(28)
  const recentCompleted = taskRows.filter((task) => task.completed_at && new Date(task.completed_at) >= recent.start && new Date(task.completed_at) <= recent.end).length
  const previousCompleted = taskRows.filter((task) => task.completed_at && new Date(task.completed_at) >= previous.start && new Date(task.completed_at) < recent.start).length
  if (recentCompleted > previousCompleted) return 'improving'
  if (recentCompleted < previousCompleted) return 'declining'
  return 'stable'
}

export function calculateGoalHealth(input) {
  const goal = input?.goal || {}
  const progressResult = input?.progress?.goal || {}
  const signals = input?.signals || {}
  const progress = Number.isFinite(Number(progressResult.progress)) ? Number(progressResult.progress) : Number(signals.progress) || 0
  const remainingProgress = Math.max(0, 100 - progress)
  const completedTasks = Number(signals.completedTasks) || 0
  const plannedTasks = Number(signals.plannedTasks) || 0
  const unfinishedTasks = Number(signals.unfinishedTasks) || 0
  const overdueTasks = Number(signals.overdueTasks) || 0
  const recentCompletionRate = Number(signals.recentCompletionRate) || 0
  const hasEvidence = Boolean(progressResult.hasEvidence || signals.hasEvidence)
  const targetDate = normalizeDate(goal.target_date)
  const daysRemaining = Number.isFinite(Number(signals.daysRemaining)) ? Number(signals.daysRemaining) : null
  const isCompleted = progress >= 100

  let status = 'no_evidence'
  let reason = HEALTH_REASONS.no_evidence

  if (isCompleted) {
    status = 'completed'
    reason = HEALTH_REASONS.completed
  } else if (!hasEvidence || progress === 0) {
    status = 'no_evidence'
    reason = HEALTH_REASONS.no_evidence
  } else if (
    targetDate
    && remainingProgress >= 25
    && (daysRemaining !== null && daysRemaining < 0
      || (daysRemaining !== null && daysRemaining <= 14 && recentCompletionRate < 0.7))
  ) {
    status = 'behind'
    reason = targetDate && daysRemaining !== null && daysRemaining < 0
      ? 'The target date has passed and significant roadmap work remains.'
      : 'The target date is approaching and significant roadmap work remains.'
  } else if (
    overdueTasks >= 2
    || (recentCompletionRate < 0.5 && plannedTasks > 0)
    || (signals.recentExecutionTrend === 'declining' && completedTasks > 0)
    || (unfinishedTasks >= Math.max(3, Math.ceil(plannedTasks * 0.5)) && recentCompletionRate < 0.7)
  ) {
    status = 'at_risk'
    reason = overdueTasks >= 2
      ? 'Work has been missed recently and the goal needs attention.'
      : 'Some planned work has been missed recently.'
  } else {
    status = 'on_track'
    reason = 'You’re making steady progress toward this goal.'
  }

  return {
    goal: { id: goal.id, title: goal.title },
    health: {
      status,
      label: HEALTH_LABELS[status],
      reason,
    },
    signals: {
      progress,
      remainingProgress,
      targetDate,
      daysRemaining,
      overdueTasks,
      recentCompletionRate,
      completedTasks,
      plannedTasks,
      unfinishedTasks,
      recentExecutionTrend: signals.recentExecutionTrend || 'unknown',
    },
    contextualEvidence: false,
  }
}

export async function getGoalHealth(userId, goalId) {
  const [{ pool }, { getGoalProgress, ProgressServiceError }] = await Promise.all([
    import('../config/database.js'),
    import('./progressService.js'),
  ])
  const goalResult = await pool.query(
    `SELECT id, title, target_date::text AS target_date
     FROM public.goals
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [goalId, userId],
  )
  if (!goalResult.rowCount) throw new ProgressServiceError('Goal not found', 404)
  const goal = goalResult.rows[0]
  const progress = await getGoalProgress(userId, goalId)
  const today = new Date().toISOString().slice(0, 10)
  const taskResult = await pool.query(
    `SELECT id, status, due_date::text AS due_date, completed_at, created_at
     FROM public.tasks
     WHERE user_id = $1 AND goal_id = $2`,
    [userId, goalId],
  )
  const taskRows = taskResult.rows
  const completedTasks = taskRows.filter((task) => task.status === 'completed').length
  const unfinishedTasks = taskRows.filter((task) => !['completed', 'skipped'].includes(task.status)).length
  const plannedTasks = taskRows.length
  const overdueTasks = taskRows.filter((task) => task.status !== 'completed' && task.due_date && task.due_date < today).length
  const recentCompletionRate = getRecentCompletionRate(taskRows, today)
  const recentExecutionTrend = getExecutionTrend(taskRows, today)
  const daysRemaining = goal.target_date ? dateDifferenceInDays(today, goal.target_date) : null
  const signals = {
    progress: progress.goal.progress,
    remainingProgress: Math.max(0, 100 - progress.goal.progress),
    daysRemaining,
    overdueTasks,
    recentCompletionRate,
    completedTasks,
    plannedTasks,
    unfinishedTasks,
    recentExecutionTrend,
    hasEvidence: progress.goal.hasEvidence,
  }
  const result = calculateGoalHealth({ goal, progress, signals })
  return { goal: { id: goal.id, title: goal.title }, health: result.health, signals: result.signals }
}

export { HEALTH_STATES }
