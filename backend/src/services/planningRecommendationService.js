import { pool } from '../config/database.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const FIELDS = `id, user_id, recommendation_key AS dedupe_key, recommendation_type, title, explanation, reason,
  suggested_action, context, week_start_date::text AS affected_week_start,
  affected_date::text AS affected_date, task_id, weekly_plan_id, life_event_id,
  affected_week_end::text AS affected_week_end, affected_task_ids, resolution, status, created_at, updated_at`

export class PlanningRecommendationError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PlanningRecommendationError'
    this.status = status
  }
}

function validateDate(value, field) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) throw new PlanningRecommendationError(`${field} must use YYYY-MM-DD format`, 400)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new PlanningRecommendationError(`${field} must be a valid calendar date`, 400)
  return value
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new PlanningRecommendationError(`${field} must be a valid UUID`, 400)
  return value
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function dateDifferenceInDays(earlier, later) {
  return Math.floor((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86400000)
}

function weekStartForDate(value, weekStartsOn) {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay()
  return shiftDate(value, -((day - weekStartsOn + 7) % 7))
}

function serializeRecommendation(row) {
  if (!row) return row
  return {
    ...row,
    suggested_action: typeof row.suggested_action === 'string' ? JSON.parse(row.suggested_action) : row.suggested_action,
    context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
  }
}

async function savePendingRecommendation(userId, recommendation) {
  await pool.query(
    `INSERT INTO public.planning_recommendations
       (user_id, recommendation_key, recommendation_type, title, explanation, reason,
        suggested_action, context, week_start_date, affected_date, task_id, weekly_plan_id,
        life_event_id, affected_week_end, affected_task_ids)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14,$15::uuid[])
      ON CONFLICT (user_id, recommendation_key) DO UPDATE SET
       title = EXCLUDED.title, explanation = EXCLUDED.explanation, reason = EXCLUDED.reason,
       suggested_action = EXCLUDED.suggested_action, context = EXCLUDED.context,
       week_start_date = EXCLUDED.week_start_date, affected_date = EXCLUDED.affected_date,
       task_id = EXCLUDED.task_id, weekly_plan_id = EXCLUDED.weekly_plan_id,
       life_event_id = EXCLUDED.life_event_id, affected_week_end = EXCLUDED.affected_week_end,
       affected_task_ids = EXCLUDED.affected_task_ids, updated_at = NOW()
     WHERE public.planning_recommendations.status = 'pending'`,
    [userId, recommendation.dedupe_key, recommendation.recommendation_type, recommendation.title,
      recommendation.explanation, recommendation.reason, JSON.stringify(recommendation.suggested_action),
      JSON.stringify(recommendation.context), recommendation.affected_week_start, recommendation.affected_date,
      recommendation.task_id, recommendation.weekly_plan_id, recommendation.life_event_id,
      recommendation.affected_week_end, recommendation.affected_task_ids],
  )
}

async function getPlanningContext(userId, weekStart) {
  const weekEnd = shiftDate(weekStart, 6)
  const [planResult, routineResult, eventResult, taskResult, settingsResult, todayResult] = await Promise.all([
    pool.query(
      `SELECT id, week_start_date::text AS week_start_date, week_end_date::text AS week_end_date,
              available_hours, focus, status
       FROM public.weekly_plans WHERE user_id = $1 AND week_start_date = $2 LIMIT 1`,
      [userId, weekStart],
    ),
    pool.query(
      `SELECT frequency, days_of_week, estimated_minutes
       FROM public.daily_routines WHERE user_id = $1 AND is_active = true`,
      [userId],
    ),
    pool.query(
      `SELECT id, title, event_type, start_date::text AS start_date, end_date::text AS end_date,
              impact_level, estimated_daily_impact_minutes
       FROM public.life_events
       WHERE user_id = $1 AND start_date <= $3 AND end_date >= $2
       ORDER BY start_date, id`,
      [userId, weekStart, weekEnd],
    ),
    pool.query(
      `SELECT id, title, due_date::text AS due_date, estimated_minutes, priority, status, weekly_plan_id
       FROM public.tasks
       WHERE user_id = $1 AND status IN ('pending', 'in_progress')
         AND ((due_date >= $2 AND due_date <= $3) OR weekly_plan_id = (
           SELECT id FROM public.weekly_plans WHERE user_id = $1 AND week_start_date = $2 LIMIT 1
         ) OR due_date <= ((NOW() AT TIME ZONE COALESCE((SELECT timezone FROM public.users WHERE id = $1), 'UTC'))::date - 14))
       ORDER BY CASE priority WHEN 'low' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                due_date ASC NULLS LAST, created_at ASC`,
      [userId, weekStart, weekEnd],
    ),
    pool.query('SELECT COALESCE(week_starts_on, 1) AS week_starts_on FROM public.user_settings WHERE user_id = $1 LIMIT 1', [userId]),
    pool.query(
      `SELECT (NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))::date::text AS today
       FROM public.users WHERE id = $1 LIMIT 1`,
      [userId],
    ),
  ])
  if (!todayResult.rowCount) throw new PlanningRecommendationError('User not found', 404)
  const plan = planResult.rows[0] || null
  const routines = routineResult.rows
  const events = eventResult.rows
  const tasks = taskResult.rows
  const today = todayResult.rows[0].today
  const weekStartsOn = settingsResult.rows[0]?.week_starts_on ?? 1
  const routineMinutes = routines.reduce((sum, routine) => {
    const occurrences = Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index))
      .filter((date) => routine.frequency === 'daily' || routine.days_of_week.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())).length
    return sum + occurrences * (routine.estimated_minutes || 0)
  }, 0)
  const eventImpactMinutes = events.reduce((sum, event) => {
    let days = 0
    for (let offset = 0; offset < 7; offset += 1) {
      const date = shiftDate(weekStart, offset)
      if (date >= event.start_date && date <= event.end_date) days += 1
    }
    return sum + days * event.estimated_daily_impact_minutes
  }, 0)
  const plannedTasks = tasks.filter((task) => (task.due_date && task.due_date >= weekStart && task.due_date <= weekEnd)
    || (plan && task.weekly_plan_id === plan.id))
  const taskMinutes = plannedTasks.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0)
  const availableMinutes = Number(plan?.available_hours || 0) * 60
  return { weekStart, weekEnd, plan, routines, events, tasks, plannedTasks, today, weekStartsOn, routineMinutes, eventImpactMinutes, taskMinutes, availableMinutes }
}

function capacityRecommendation(context) {
  if (!context.plan || context.plannedTasks.length === 0) return null
  const effectiveCapacity = Math.max(0, context.availableMinutes - context.routineMinutes - context.eventImpactMinutes)
  if (context.taskMinutes <= effectiveCapacity) return null
  const task = context.plannedTasks[0]
  const proposedDate = task.due_date && task.due_date >= context.weekStart && task.due_date <= context.weekEnd
    ? shiftDate(task.due_date, 7)
    : shiftDate(context.weekEnd, 1)
  return {
    dedupe_key: `capacity:${context.weekStart}`,
    recommendation_type: 'capacity_overload',
    title: 'Your week looks a little full',
    explanation: 'Your planned workload may exceed your available capacity. Consider moving this lower-priority task.',
    reason: `Estimated task effort is ${context.taskMinutes} minutes, compared with about ${effectiveCapacity} minutes available for planning.`,
    suggested_action: { kind: 'move_task', task_id: task.id, due_date: proposedDate },
    context: { task_title: task.title, planned_minutes: context.taskMinutes, estimated_capacity_minutes: effectiveCapacity },
    affected_week_start: context.weekStart,
    affected_week_end: context.weekEnd,
    affected_date: task.due_date,
    task_id: task.id,
    weekly_plan_id: context.plan.id,
    life_event_id: null,
    affected_task_ids: [task.id],
  }
}

function eventRecommendations(context) {
  const recommendations = []
  for (const event of context.events.filter((item) => ['medium', 'high'].includes(item.impact_level))) {
    const overlappingTasks = context.plannedTasks.filter((task) => task.due_date && task.due_date >= event.start_date && task.due_date <= event.end_date)
    const task = overlappingTasks[0] || null
    const nextDate = shiftDate(event.end_date, 1)
    recommendations.push({
      dedupe_key: `event:${event.id}:${context.weekStart}`,
      recommendation_type: 'life_event_conflict',
      title: `${event.title} may affect this week`,
      explanation: `Your upcoming ${event.event_type} may reduce the time available for planned tasks.`,
      reason: `${event.title} is scheduled ${event.start_date === event.end_date ? `on ${event.start_date}` : `from ${event.start_date} to ${event.end_date}`} and has ${event.impact_level} planning impact.`,
      suggested_action: task ? { kind: 'move_task', task_id: task.id, due_date: nextDate } : { kind: 'acknowledge' },
      context: { event_id: event.id, event_title: event.title, event_start_date: event.start_date, event_end_date: event.end_date, impact_level: event.impact_level, task_title: task?.title || null },
      affected_week_start: context.weekStart,
      affected_week_end: context.weekEnd,
      affected_date: event.start_date,
      task_id: task?.id || null,
      weekly_plan_id: context.plan?.id || null,
      life_event_id: event.id,
      affected_task_ids: task ? [task.id] : [],
    })
  }
  return recommendations
}

function missedTaskRecommendations(context) {
  const recommendations = []
  for (const task of context.tasks) {
    if (!task.due_date || task.due_date >= context.today || dateDifferenceInDays(task.due_date, context.today) < 14) continue
    recommendations.push({
      dedupe_key: `missed:${task.id}`,
      recommendation_type: 'overdue_task',
      title: 'A task may need a smaller next step',
      explanation: 'This task has remained incomplete for at least two weeks. Consider rescheduling it or breaking it into smaller actions.',
      reason: `“${task.title}” is still open and was due on ${task.due_date}.`,
      suggested_action: { kind: 'move_task', task_id: task.id, due_date: shiftDate(context.today, 1) },
      context: { task_title: task.title, original_due_date: task.due_date, days_overdue: dateDifferenceInDays(task.due_date, context.today) },
      affected_week_start: context.weekStart,
      affected_week_end: context.weekEnd,
      affected_date: task.due_date,
      task_id: task.id,
      weekly_plan_id: task.weekly_plan_id,
      life_event_id: null,
      affected_task_ids: [task.id],
    })
  }
  return recommendations
}

async function resolveWeek(userId, filters) {
  if (filters.week_start_date !== undefined) return validateDate(filters.week_start_date, 'week_start_date')
  const date = validateDate(filters.date, 'date')
  const result = await pool.query('SELECT COALESCE(week_starts_on, 1) AS week_starts_on FROM public.user_settings WHERE user_id = $1 LIMIT 1', [userId])
  return weekStartForDate(date, result.rows[0]?.week_starts_on ?? 1)
}

export async function listPlanningRecommendations(userId, filters = {}) {
  const weekStart = await resolveWeek(userId, filters)
  const context = await getPlanningContext(userId, weekStart)
  const recommendations = [capacityRecommendation(context), ...eventRecommendations(context), ...missedTaskRecommendations(context)].filter(Boolean)
  for (const recommendation of recommendations) await savePendingRecommendation(userId, recommendation)

  const values = [userId, weekStart]
  const where = ['user_id = $1', "status = 'pending'", 'week_start_date = $2']
  if (filters.date !== undefined) {
    const date = validateDate(filters.date, 'date')
    const tomorrow = shiftDate(date, 1)
    values.push(date, tomorrow)
    where.push(`(recommendation_type = 'life_event_conflict' AND (context->>'event_start_date')::date <= $4 AND (context->>'event_end_date')::date >= $3
      OR recommendation_type = 'overdue_task' AND (context->>'original_due_date')::date <= $3)`)
  }
  const result = await pool.query(
    `SELECT ${FIELDS} FROM public.planning_recommendations WHERE ${where.join(' AND ')} ORDER BY created_at ASC`,
    values,
  )
  return result.rows.map(serializeRecommendation)
}

async function ensurePlanForDate(client, userId, date, weekStartsOn, sourcePlan) {
  const start = weekStartForDate(date, weekStartsOn)
  const end = shiftDate(start, 6)
  let result = await client.query(
    'SELECT id FROM public.weekly_plans WHERE user_id = $1 AND week_start_date = $2 LIMIT 1',
    [userId, start],
  )
  if (result.rowCount) return { id: result.rows[0].id, start, end }
  result = await client.query(
    `INSERT INTO public.weekly_plans (user_id, week_start_date, week_end_date, focus, available_hours, status)
     VALUES ($1,$2,$3,$4,$5,'planned') RETURNING id`,
    [userId, start, end, null, sourcePlan?.available_hours ?? 0],
  )
  return { id: result.rows[0].id, start, end }
}

async function applyTaskMove(client, userId, recommendation, dueDate) {
  const action = recommendation.suggested_action
  const taskId = validateId(action.task_id, 'task_id')
  const taskResult = await client.query(
    `SELECT id, weekly_plan_id, due_date::text AS due_date
     FROM public.tasks WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'in_progress') FOR UPDATE`,
    [taskId, userId],
  )
  if (!taskResult.rowCount) throw new PlanningRecommendationError('Affected task not found', 404)
  const task = taskResult.rows[0]
  const settings = await client.query('SELECT COALESCE(week_starts_on, 1) AS week_starts_on FROM public.user_settings WHERE user_id = $1 LIMIT 1', [userId])
  const weekStartsOn = settings.rows[0]?.week_starts_on ?? 1
  const sourcePlanResult = task.weekly_plan_id
    ? await client.query('SELECT id, available_hours FROM public.weekly_plans WHERE id = $1 AND user_id = $2 LIMIT 1', [task.weekly_plan_id, userId])
    : { rows: [] }
  const sourcePlan = sourcePlanResult.rows[0] || null
  const destination = await ensurePlanForDate(client, userId, dueDate, weekStartsOn, sourcePlan)
  const result = await client.query(
    `UPDATE public.tasks SET due_date = $3, weekly_plan_id = $4, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING id, title, due_date::text AS due_date, weekly_plan_id`,
    [taskId, userId, dueDate, destination.id],
  )
  return result.rows[0]
}

export async function updatePlanningRecommendation(userId, recommendationId, input = {}) {
  validateId(recommendationId, 'recommendationId')
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PlanningRecommendationError('Request body must be an object', 400)
  const allowed = ['status', 'due_date']
  const unknown = Object.keys(input).find((key) => !allowed.includes(key))
  if (unknown) throw new PlanningRecommendationError(`Field ${unknown} cannot be set`, 400)
  if (!['accepted', 'modified', 'ignored'].includes(input.status)) throw new PlanningRecommendationError('status must be accepted, modified, or ignored', 400)
  if (input.status === 'modified' && input.due_date === undefined) throw new PlanningRecommendationError('due_date is required when modifying a suggestion', 400)
  const dueDate = input.status === 'modified' ? validateDate(input.due_date, 'due_date') : null
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query(
      `SELECT ${FIELDS} FROM public.planning_recommendations WHERE id = $1 AND user_id = $2 AND status = 'pending' FOR UPDATE`,
      [recommendationId, userId],
    )
    if (!found.rowCount) throw new PlanningRecommendationError('Planning suggestion not found', 404)
    const recommendation = serializeRecommendation(found.rows[0])
    let affectedTask = null
    if (input.status !== 'ignored' && recommendation.suggested_action.kind === 'move_task') {
      const date = input.status === 'modified' ? dueDate : validateDate(recommendation.suggested_action.due_date, 'suggested due_date')
      affectedTask = await applyTaskMove(client, userId, recommendation, date)
    }
    const updated = await client.query(
      `UPDATE public.planning_recommendations SET status = $3, resolution = $4::jsonb, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING ${FIELDS}`,
      [recommendationId, userId, input.status, JSON.stringify(input.status === 'ignored'
        ? { ignored: true }
        : affectedTask ? { due_date: affectedTask.due_date, weekly_plan_id: affectedTask.weekly_plan_id }
          : { acknowledged: true })],
    )
    await client.query('COMMIT')
    return { recommendation: serializeRecommendation(updated.rows[0]), affectedTask }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}