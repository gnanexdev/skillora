import { pool } from '../config/database.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PLAN_STATUSES = new Set(['planned', 'active', 'completed'])
const PLAN_FIELDS = 'id, user_id, week_start_date::text AS week_start_date, week_end_date::text AS week_end_date, focus, available_hours, status, created_at, updated_at'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export class WeeklyPlanServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'WeeklyPlanServiceError'
    this.status = status
  }
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new WeeklyPlanServiceError(`${field} must be a valid UUID`, 400)
  }
  return value
}

function validateDate(value, field) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new WeeklyPlanServiceError(`${field} must use YYYY-MM-DD format`, 400)
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new WeeklyPlanServiceError(`${field} must be a valid calendar date`, 400)
  }
  return value
}

function validateBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new WeeklyPlanServiceError('Request body must be an object', 400)
  }
  return input
}

function validateFocus(value) {
  if (value === null) return null
  if (typeof value !== 'string') throw new WeeklyPlanServiceError('focus must be a string', 400)
  const focus = value.trim()
  if (focus.length > 500) throw new WeeklyPlanServiceError('focus must be 500 characters or fewer', 400)
  return focus || null
}

function validateHours(value) {
  const hours = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
    throw new WeeklyPlanServiceError('available_hours must be a number between 0 and 168', 400)
  }
  return hours
}

function validateStatus(value) {
  if (typeof value !== 'string' || !PLAN_STATUSES.has(value)) {
    throw new WeeklyPlanServiceError('status must be planned, active, or completed', 400)
  }
  return value
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function getWeekStartDay(userId) {
  const result = await pool.query(
    'SELECT week_starts_on FROM public.user_settings WHERE user_id = $1 LIMIT 1',
    [userId],
  )
  return result.rows[0]?.week_starts_on ?? 1
}

export async function getCurrentWeek(userId) {
  const result = await pool.query(
    `SELECT COALESCE(settings.week_starts_on, 1) AS week_starts_on,
       (NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))::date::text AS today,
       EXTRACT(DOW FROM NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))::int AS day_of_week
     FROM public.users
     LEFT JOIN public.user_settings AS settings ON settings.user_id = users.id
     WHERE users.id = $1
     LIMIT 1`,
    [userId],
  )
  if (!result.rowCount) throw new WeeklyPlanServiceError('User not found', 404)
  const { week_starts_on: weekStartsOn, today, day_of_week: dayOfWeek } = result.rows[0]
  const daysSinceStart = (dayOfWeek - weekStartsOn + 7) % 7
  const weekStartDate = addDays(today, -daysSinceStart)
  const weekEndDate = addDays(weekStartDate, 6)
  const planResult = await pool.query(
    `SELECT ${PLAN_FIELDS}
     FROM public.weekly_plans
     WHERE user_id = $1 AND week_start_date = $2
     LIMIT 1`,
    [userId, weekStartDate],
  )
  return {
    weeklyPlan: planResult.rows[0] || null,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    week_starts_on: weekStartsOn,
  }
}

export async function listWeeklyPlans(userId, filters = {}) {
  const conditions = ['user_id = $1']
  const values = [userId]
  if (filters.status !== undefined) {
    conditions.push(`status = $${values.push(validateStatus(filters.status))}`)
  }
  if (filters.week_start_date !== undefined) {
    conditions.push(`week_start_date = $${values.push(validateDate(filters.week_start_date, 'week_start_date'))}`)
  }
  const result = await pool.query(
    `SELECT ${PLAN_FIELDS} FROM public.weekly_plans
     WHERE ${conditions.join(' AND ')}
     ORDER BY week_start_date DESC`,
    values,
  )
  return result.rows
}

export async function getWeeklyPlan(userId, planId) {
  validateId(planId, 'weeklyPlanId')
  const result = await pool.query(
    `SELECT ${PLAN_FIELDS} FROM public.weekly_plans
     WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [planId, userId],
  )
  if (!result.rowCount) throw new WeeklyPlanServiceError('Weekly plan not found', 404)
  return result.rows[0]
}

export async function createWeeklyPlan(userId, input) {
  const body = validateBody(input)
  const allowed = ['week_start_date', 'week_end_date', 'focus', 'available_hours', 'status']
  const unknown = Object.keys(body).find((key) => !allowed.includes(key))
  if (unknown) throw new WeeklyPlanServiceError(`Field ${unknown} cannot be set`, 400)
  const weekStartDate = validateDate(body.week_start_date, 'week_start_date')
  const weekStartsOn = await getWeekStartDay(userId)
  const startDay = new Date(`${weekStartDate}T00:00:00.000Z`).getUTCDay()
  if (startDay !== weekStartsOn) {
    throw new WeeklyPlanServiceError('week_start_date must match your configured week start day', 400)
  }
  const weekEndDate = body.week_end_date === undefined
    ? addDays(weekStartDate, 6)
    : validateDate(body.week_end_date, 'week_end_date')
  if (weekEndDate < weekStartDate) throw new WeeklyPlanServiceError('week_end_date cannot be before week_start_date', 400)
  const focus = body.focus === undefined ? null : validateFocus(body.focus)
  const availableHours = body.available_hours === undefined ? 0 : validateHours(body.available_hours)
  const status = body.status === undefined ? 'planned' : validateStatus(body.status)
  try {
    const result = await pool.query(
      `INSERT INTO public.weekly_plans (user_id, week_start_date, week_end_date, focus, available_hours, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PLAN_FIELDS}`,
      [userId, weekStartDate, weekEndDate, focus, availableHours, status],
    )
    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') throw new WeeklyPlanServiceError('A weekly plan already exists for this week', 409)
    throw error
  }
}

export async function updateWeeklyPlan(userId, planId, input) {
  validateId(planId, 'weeklyPlanId')
  const body = validateBody(input)
  const allowed = ['week_start_date', 'week_end_date', 'focus', 'available_hours', 'status']
  const unknown = Object.keys(body).find((key) => !allowed.includes(key))
  if (unknown) throw new WeeklyPlanServiceError(`Field ${unknown} cannot be changed`, 400)
  const current = await getWeeklyPlan(userId, planId)
  const updates = []
  if (Object.hasOwn(body, 'week_start_date')) {
    const start = validateDate(body.week_start_date, 'week_start_date')
    const configuredDay = await getWeekStartDay(userId)
    if (new Date(`${start}T00:00:00.000Z`).getUTCDay() !== configuredDay) {
      throw new WeeklyPlanServiceError('week_start_date must match your configured week start day', 400)
    }
    updates.push(['week_start_date', start])
    if (!Object.hasOwn(body, 'week_end_date')) updates.push(['week_end_date', addDays(start, 6)])
  }
  if (Object.hasOwn(body, 'week_end_date')) updates.push(['week_end_date', validateDate(body.week_end_date, 'week_end_date')])
  if (Object.hasOwn(body, 'focus')) updates.push(['focus', validateFocus(body.focus)])
  if (Object.hasOwn(body, 'available_hours')) updates.push(['available_hours', validateHours(body.available_hours)])
  if (Object.hasOwn(body, 'status')) updates.push(['status', validateStatus(body.status)])
  if (!updates.length) throw new WeeklyPlanServiceError('At least one editable field is required', 400)
  const updated = Object.fromEntries(updates)
  const finalStart = updated.week_start_date || current.week_start_date
  const finalEnd = updated.week_end_date || current.week_end_date
  if (finalEnd < finalStart) throw new WeeklyPlanServiceError('week_end_date cannot be before week_start_date', 400)
  const assignments = updates.map(([field], index) => `${field} = $${index + 3}`)
  try {
    const result = await pool.query(
      `UPDATE public.weekly_plans
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING ${PLAN_FIELDS}`,
      [planId, userId, ...updates.map(([, value]) => value)],
    )
    if (!result.rowCount) throw new WeeklyPlanServiceError('Weekly plan not found', 404)
    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') throw new WeeklyPlanServiceError('A weekly plan already exists for this week', 409)
    throw error
  }
}

export async function deleteWeeklyPlan(userId, planId) {
  validateId(planId, 'weeklyPlanId')
  const result = await pool.query('DELETE FROM public.weekly_plans WHERE id = $1 AND user_id = $2 RETURNING id', [planId, userId])
  if (!result.rowCount) throw new WeeklyPlanServiceError('Weekly plan not found', 404)
}

export async function getWeekStartSetting(userId) {
  return getWeekStartDay(userId)
}

export function getWeekEndDate(weekStartDate) {
  return addDays(weekStartDate, 6)
}

export function validateWeekDate(value, field = 'week_start_date') {
  return validateDate(value, field)
}