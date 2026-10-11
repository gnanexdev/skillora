import { pool } from '../config/database.js'
import { getGoalProgress } from './progressService.js'
import { getWeekRangeForDate } from './weeklyReviewCalendar.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class AchievementServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'AchievementServiceError'
    this.status = status
  }
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new AchievementServiceError(`${field} must be a valid UUID`, 400)
  }
  return value
}

async function awardAchievement(userId, { key, type, title, description }) {
  const result = await pool.query(
    `INSERT INTO public.achievements (user_id, achievement_key, type, title, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, achievement_key) DO NOTHING
     RETURNING id`,
    [userId, key, type, title, description],
  )
  return result.rows[0] || null
}

export async function listAchievements(userId) {
  const result = await pool.query(
    `SELECT id, type, achievement_key, title, description, earned_at
     FROM public.achievements
     WHERE user_id = $1
     ORDER BY earned_at DESC, id DESC`,
    [userId],
  )
  return result.rows
}

export async function getAchievement(userId, achievementId) {
  validateId(achievementId, 'achievementId')
  const result = await pool.query(
    `SELECT id, type, achievement_key, title, description, earned_at
     FROM public.achievements
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [achievementId, userId],
  )
  if (!result.rowCount) throw new AchievementServiceError('Achievement not found', 404)
  return result.rows[0]
}

async function evaluateWeeklyConsistency(userId, completedTask) {
  const settingsResult = await pool.query(
    `SELECT COALESCE(settings.week_starts_on, 1) AS week_starts_on,
       users.timezone,
       ($2::timestamptz AT TIME ZONE COALESCE(users.timezone, 'UTC'))::date::text AS local_date
     FROM public.users
     LEFT JOIN public.user_settings AS settings ON settings.user_id = users.id
     WHERE users.id = $1
     LIMIT 1`,
    [userId, completedTask.completed_at],
  )
  if (!settingsResult.rowCount) return
  const { week_starts_on: weekStartsOn, timezone, local_date: localDate } = settingsResult.rows[0]
  const week = getWeekRangeForDate(localDate, weekStartsOn)
  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT (completed_at AT TIME ZONE $2)::date)::int AS completed_dates
     FROM public.tasks
     WHERE user_id = $1 AND status = 'completed' AND completed_at IS NOT NULL
       AND (completed_at AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date`,
    [userId, timezone, week.week_start_date, week.week_end_date],
  )
  if (countResult.rows[0].completed_dates < 3) return
  await awardAchievement(userId, {
    key: `three-days-in-week:${week.week_start_date}`,
    type: 'weekly_consistency',
    title: 'Three days in a week',
    description: `Completed tasks on at least three distinct dates during the week starting ${week.week_start_date}.`,
  })
}

async function evaluateDerivedRoadmapAchievements(userId, goalId, skillId) {
  if (!goalId || !skillId) return
  const progress = await getGoalProgress(userId, goalId)
  for (const milestone of progress.milestones) {
    const skill = milestone.skills.find((item) => item.id === skillId)
    if (!skill) continue
    if (skill.hasEvidence && skill.progress === 100) {
      await awardAchievement(userId, {
        key: `skill-completed:${skill.id}`,
        type: 'skill_completed',
        title: `Skill completed: ${skill.title}`,
        description: `Marked ${skill.title} complete in its roadmap.`,
      })
    }
    if (milestone.hasEvidence && milestone.progress === 100) {
      await awardAchievement(userId, {
        key: `milestone-completed:${milestone.id}`,
        type: 'milestone_completed',
        title: `Milestone completed: ${milestone.title}`,
        description: `All skills in ${milestone.title} have completed task evidence.`,
      })
    }
    break
  }
}

export async function evaluateRoadmapCompletion(userId, skillId) {
  validateId(skillId, 'skillId')
  const result = await pool.query(
    `SELECT s.id, g.id AS goal_id
     FROM public.skills s
     JOIN public.milestones m ON m.id = s.milestone_id
     JOIN public.roadmaps r ON r.id = m.roadmap_id
     JOIN public.goals g ON g.id = r.goal_id
     WHERE s.id = $1 AND g.user_id = $2 AND s.status = 'completed'
     LIMIT 1`,
    [skillId, userId],
  )
  if (!result.rowCount) return
  await evaluateDerivedRoadmapAchievements(userId, result.rows[0].goal_id, skillId)
}

export async function evaluateTaskCompletion(userId, taskId) {
  validateId(taskId, 'taskId')
  const taskResult = await pool.query(
    `SELECT id, title, goal_id, skill_id, status, completed_at
     FROM public.tasks
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [taskId, userId],
  )
  const task = taskResult.rows[0]
  if (!task || task.status !== 'completed' || !task.completed_at) return []

  const earned = []
  const firstTaskResult = await pool.query(
    `SELECT id FROM public.tasks
     WHERE user_id = $1 AND status = 'completed' AND completed_at IS NOT NULL
     ORDER BY completed_at ASC, id ASC
     LIMIT 1`,
    [userId],
  )
  if (firstTaskResult.rows[0]?.id === task.id) {
    const award = await awardAchievement(userId, {
      key: 'first-task-completed',
      type: 'first_task_completed',
      title: 'First task completed',
      description: `Completed ${task.title}.`,
    })
    if (award) earned.push(award)
  }

  await evaluateWeeklyConsistency(userId, task)
  return earned
}

export async function evaluateGoalCompletion(userId, goalId) {
  validateId(goalId, 'goalId')
  const result = await pool.query(
    `SELECT id, title FROM public.goals
     WHERE id = $1 AND user_id = $2 AND status = 'completed' AND completed_at IS NOT NULL
     LIMIT 1`,
    [goalId, userId],
  )
  if (!result.rowCount) return null
  const goal = result.rows[0]
  return awardAchievement(userId, {
    key: `goal-completed:${goal.id}`,
    type: 'goal_completed',
    title: `Goal completed: ${goal.title}`,
    description: `Marked ${goal.title} as completed.`,
  })
}