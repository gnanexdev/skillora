import { pool } from '../config/database.js'
import { getWeekRangeForDate, shiftCalendarDate, validateWeekStartDate } from './weeklyReviewCalendar.js'

const REFLECTION_FIELDS = ['went_well', 'difficult', 'learned', 'improve_next_week', 'notes']
const MAX_REFLECTION_LENGTH = 2000

export class WeeklyReviewServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'WeeklyReviewServiceError'
    this.status = status
  }
}

function validateReflections(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new WeeklyReviewServiceError('Request body must be an object', 400)
  }
  const allowedFields = new Set(['week_start_date', ...REFLECTION_FIELDS])
  const unknownField = Object.keys(input).find((field) => !allowedFields.has(field))
  if (unknownField) throw new WeeklyReviewServiceError(`Field ${unknownField} cannot be set`, 400)

  return Object.fromEntries(REFLECTION_FIELDS.map((field) => {
    const value = input[field] ?? ''
    if (typeof value !== 'string') throw new WeeklyReviewServiceError(`${field} must be a string`, 400)
    const text = value.trim()
    if (text.length > MAX_REFLECTION_LENGTH) {
      throw new WeeklyReviewServiceError(`${field} must be ${MAX_REFLECTION_LENGTH} characters or fewer`, 400)
    }
    return [field, text]
  }))
}

async function getUserWeekSettings(userId) {
  const result = await pool.query(
    `SELECT COALESCE(settings.week_starts_on, 1) AS week_starts_on,
       users.timezone,
       (NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))::date::text AS today
     FROM public.users
     LEFT JOIN public.user_settings AS settings ON settings.user_id = users.id
     WHERE users.id = $1
     LIMIT 1`,
    [userId],
  )
  if (!result.rowCount) throw new WeeklyReviewServiceError('User not found', 404)
  return result.rows[0]
}

async function getReviewWeek(userId, requestedStart) {
  const settings = await getUserWeekSettings(userId)
  const currentWeek = getWeekRangeForDate(settings.today, settings.week_starts_on)
  let weekStartDate
  try {
    weekStartDate = requestedStart === undefined
      ? currentWeek.week_start_date
      : validateWeekStartDate(requestedStart, settings.week_starts_on)
  } catch (error) {
    if (error instanceof TypeError) throw new WeeklyReviewServiceError(error.message, 400)
    throw error
  }
  const weekEndDate = shiftCalendarDate(weekStartDate, 6)
  return {
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    next_week_start_date: shiftCalendarDate(weekStartDate, 7),
    current_week_start_date: currentWeek.week_start_date,
    current_week_end_date: currentWeek.week_end_date,
    current_next_week_start_date: shiftCalendarDate(currentWeek.week_start_date, 7),
    week_starts_on: settings.week_starts_on,
    timezone: settings.timezone,
    is_current_week: weekStartDate === currentWeek.week_start_date,
  }
}

export async function getWeeklyReview(userId, requestedStart) {
  const week = await getReviewWeek(userId, requestedStart)
  const result = await pool.query(
    `WITH selected_plan AS (
       SELECT id, focus, available_hours
       FROM public.weekly_plans
       WHERE user_id = $1 AND week_start_date = $2
       LIMIT 1
     ), selected_tasks AS (
       SELECT DISTINCT task.id, task.status, task.estimated_minutes
       FROM public.tasks AS task
       LEFT JOIN selected_plan AS plan ON true
       WHERE task.user_id = $1
         AND (task.weekly_plan_id = plan.id OR task.due_date BETWEEN $2 AND $3)
     )
     SELECT plan.id AS weekly_plan_id,
       plan.focus,
       COALESCE(plan.available_hours, 0)::numeric AS available_hours,
       COUNT(task.id)::int AS total_planned_tasks,
       COUNT(task.id) FILTER (WHERE task.status = 'completed')::int AS completed_tasks,
       COUNT(task.id) FILTER (WHERE task.status IN ('pending', 'in_progress'))::int AS unfinished_tasks,
       COUNT(task.id) FILTER (WHERE task.status = 'skipped')::int AS skipped_tasks,
       COALESCE(SUM(task.estimated_minutes), 0)::int AS estimated_task_minutes
     FROM (SELECT 1) AS anchor
     LEFT JOIN selected_plan AS plan ON true
     LEFT JOIN selected_tasks AS task ON true
     GROUP BY plan.id, plan.focus, plan.available_hours`,
    [userId, week.week_start_date, week.week_end_date],
  )
  const reviewResult = await pool.query(
    `SELECT id, week_start_date::text AS week_start_date,
       went_well, difficult, learned, improve_next_week, notes,
       created_at, updated_at
    FROM public.weekly_review_entries
     WHERE user_id = $1 AND week_start_date = $2
     LIMIT 1`,
    [userId, week.week_start_date],
  )
  const summary = result.rows[0]
  const plannedMinutes = summary.estimated_task_minutes
  const availableMinutes = Number(summary.available_hours) * 60
  return {
    week,
    summary: {
      total_planned_tasks: summary.total_planned_tasks,
      completed_tasks: summary.completed_tasks,
      unfinished_tasks: summary.unfinished_tasks,
      skipped_tasks: summary.skipped_tasks,
      rescheduled_tasks: null,
      estimated_task_minutes: plannedMinutes,
      available_minutes: summary.weekly_plan_id ? availableMinutes : null,
      exceeds_planned_capacity: summary.weekly_plan_id ? plannedMinutes > availableMinutes : null,
      task_statuses_are_current: true,
      goal_progress: {
        available: false,
        reason: 'Goal progress is derived from current task states; historical snapshots are not stored.',
      },
    },
    preparation: {
      unfinished_tasks: summary.unfinished_tasks,
      exceeds_planned_capacity: summary.weekly_plan_id ? plannedMinutes > availableMinutes : null,
      next_week_start_date: week.next_week_start_date,
    },
    review: reviewResult.rows[0] || null,
  }
}

export async function saveWeeklyReview(userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new WeeklyReviewServiceError('Request body must be an object', 400)
  }
  const week = await getReviewWeek(userId, input.week_start_date)
  const reflections = validateReflections(input)
  const result = await pool.query(
    `INSERT INTO public.weekly_review_entries
       (user_id, week_start_date, went_well, difficult, learned, improve_next_week, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, week_start_date)
     DO UPDATE SET went_well = EXCLUDED.went_well,
       difficult = EXCLUDED.difficult,
       learned = EXCLUDED.learned,
       improve_next_week = EXCLUDED.improve_next_week,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING id, week_start_date::text AS week_start_date,
       went_well, difficult, learned, improve_next_week, notes,
       created_at, updated_at`,
    [userId, week.week_start_date, ...REFLECTION_FIELDS.map((field) => reflections[field])],
  )
  return result.rows[0]
}