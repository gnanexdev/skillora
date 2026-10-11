import { pool } from '../config/database.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DAYS = new Set([0, 1, 2, 3, 4, 5, 6])
const CATEGORIES = new Set(['health', 'education', 'practice', 'personal', 'family', 'rest', 'other'])
const ROUTINE_FIELDS = 'r.id, r.user_id, r.title, r.description, r.frequency, r.days_of_week, r.estimated_minutes, r.category, r.is_active, r.created_at, r.updated_at'

export class RoutineServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'RoutineServiceError'
    this.status = status
  }
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new RoutineServiceError(`${field} must be a valid UUID`, 400)
  return value
}

function validateDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RoutineServiceError(`${field} must use YYYY-MM-DD format`, 400)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RoutineServiceError(`${field} must be a valid calendar date`, 400)
  return value
}

function validateBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RoutineServiceError('Request body must be an object', 400)
  return input
}

function validateRoutine(input, partial = false) {
  const body = validateBody(input)
  const allowed = ['title', 'description', 'frequency', 'days_of_week', 'estimated_minutes', 'category', 'is_active']
  const unknown = Object.keys(body).find((key) => !allowed.includes(key))
  if (unknown) throw new RoutineServiceError(`Field ${unknown} cannot be set`, 400)
  const values = {}
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || !body.title.trim()) throw new RoutineServiceError('title is required', 400)
    if (body.title.trim().length > 200) throw new RoutineServiceError('title must be 200 characters or fewer', 400)
    values.title = body.title.trim()
  }
  if (Object.hasOwn(body, 'description')) {
    if (body.description !== null && typeof body.description !== 'string') throw new RoutineServiceError('description must be a string', 400)
    if (typeof body.description === 'string' && body.description.length > 5000) throw new RoutineServiceError('description must be 5000 characters or fewer', 400)
    values.description = body.description?.trim() || null
  } else if (!partial) values.description = null
  if (Object.hasOwn(body, 'frequency') || !partial) {
    const frequency = body.frequency ?? 'daily'
    if (!['daily', 'weekly'].includes(frequency)) throw new RoutineServiceError('frequency must be daily or weekly', 400)
    values.frequency = frequency
  }
  if (Object.hasOwn(body, 'days_of_week') || !partial) {
    const days = body.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]
    if (!Array.isArray(days) || days.length < 1 || days.length > 7 || days.some((day) => !Number.isInteger(day) || !DAYS.has(day)) || new Set(days).size !== days.length) {
      throw new RoutineServiceError('days_of_week must contain unique day numbers from 0 (Sunday) to 6 (Saturday)', 400)
    }
    values.days_of_week = [...days].sort((left, right) => left - right)
  }
  if (values.frequency === 'daily' && values.days_of_week && values.days_of_week.length !== 7) throw new RoutineServiceError('daily routines must include every day of the week', 400)
  if (values.frequency === 'weekly' && (!values.days_of_week || values.days_of_week.length === 7)) {
    if (!partial || Object.hasOwn(body, 'frequency') || Object.hasOwn(body, 'days_of_week')) throw new RoutineServiceError('weekly routines need one or more selected days', 400)
  }
  if (Object.hasOwn(body, 'estimated_minutes') || !partial) {
    const minutes = body.estimated_minutes === null || body.estimated_minutes === '' ? null : Number(body.estimated_minutes)
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0 || minutes > 10080)) throw new RoutineServiceError('estimated_minutes must be a positive integer no greater than 10080', 400)
    values.estimated_minutes = minutes
  }
  if (Object.hasOwn(body, 'category') || !partial) {
    const category = body.category ?? 'other'
    if (typeof category !== 'string' || !CATEGORIES.has(category)) throw new RoutineServiceError('category must be health, education, practice, personal, family, rest, or other', 400)
    values.category = category
  }
  if (Object.hasOwn(body, 'is_active') || !partial) {
    const active = body.is_active ?? true
    if (typeof active !== 'boolean') throw new RoutineServiceError('is_active must be a boolean', 400)
    values.is_active = active
  }
  return values
}

export async function listRoutines(userId, { date, include_inactive } = {}) {
  let dateValue = null
  if (date !== undefined) dateValue = validateDate(date, 'date')
  const values = [userId]
  const filters = []
  if (include_inactive !== 'true') filters.push('r.is_active = true')
  if (dateValue) values.push(dateValue)
  const occurrenceJoin = dateValue ? `LEFT JOIN public.routine_occurrences o ON o.routine_id = r.id AND o.user_id = r.user_id AND o.occurrence_date = $${values.length}` : ''
  const completion = dateValue ? ', (o.completed_at IS NOT NULL) AS is_completed' : ', false AS is_completed'
  const result = await pool.query(
    `SELECT ${ROUTINE_FIELDS}${completion}
     FROM public.daily_routines r ${occurrenceJoin}
     WHERE r.user_id = $1 ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
      ${dateValue ? `AND EXTRACT(DOW FROM $${values.length}::date)::int = ANY(r.days_of_week)` : ''}
     ORDER BY r.title ASC`,
    values,
  )
  return result.rows
}

export async function getRoutine(userId, routineId) {
  validateId(routineId, 'routineId')
  const result = await pool.query(`SELECT ${ROUTINE_FIELDS.replaceAll('r.', '')} FROM public.daily_routines r WHERE r.id = $1 AND r.user_id = $2 LIMIT 1`, [routineId, userId])
  if (!result.rowCount) throw new RoutineServiceError('Routine not found', 404)
  return result.rows[0]
}

export async function createRoutine(userId, input) {
  const routine = validateRoutine(input)
  if (routine.frequency === 'daily') routine.days_of_week = [0, 1, 2, 3, 4, 5, 6]
  const result = await pool.query(
    `INSERT INTO public.daily_routines (user_id, title, description, frequency, days_of_week, estimated_minutes, category, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${ROUTINE_FIELDS.replaceAll('r.', '')}`,
    [userId, routine.title, routine.description, routine.frequency, routine.days_of_week, routine.estimated_minutes, routine.category, routine.is_active],
  )
  return result.rows[0]
}

export async function updateRoutine(userId, routineId, input) {
  validateId(routineId, 'routineId')
  const updates = validateRoutine(input, true)
  if (!Object.keys(updates).length) throw new RoutineServiceError('At least one editable field is required', 400)
  const currentResult = await pool.query(`SELECT ${ROUTINE_FIELDS} FROM public.daily_routines r WHERE r.id = $1 AND r.user_id = $2`, [routineId, userId])
  if (!currentResult.rowCount) throw new RoutineServiceError('Routine not found', 404)
  const current = currentResult.rows[0]
  const frequency = updates.frequency ?? current.frequency
  let days = updates.days_of_week ?? current.days_of_week
  if (frequency === 'daily') {
    if (updates.days_of_week && updates.days_of_week.length !== 7) throw new RoutineServiceError('daily routines must include every day of the week', 400)
    days = [0, 1, 2, 3, 4, 5, 6]
  }
  if (frequency === 'weekly' && days.length === 7) throw new RoutineServiceError('weekly routines need one or more selected days', 400)
  const fields = { ...updates, frequency, days_of_week: days }
  const entries = Object.entries(fields).filter(([key]) => Object.hasOwn(updates, key) || key === 'frequency' || key === 'days_of_week')
  const assignments = entries.map(([key], index) => `${key} = $${index + 3}`)
  const result = await pool.query(
    `UPDATE public.daily_routines SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING ${ROUTINE_FIELDS.replaceAll('r.', '')}`,
    [routineId, userId, ...entries.map(([, value]) => value)],
  )
  if (!result.rowCount) throw new RoutineServiceError('Routine not found', 404)
  return result.rows[0]
}

export async function deleteRoutine(userId, routineId) {
  validateId(routineId, 'routineId')
  const result = await pool.query('DELETE FROM public.daily_routines WHERE id = $1 AND user_id = $2 RETURNING id', [routineId, userId])
  if (!result.rowCount) throw new RoutineServiceError('Routine not found', 404)
}

export async function setRoutineOccurrence(userId, routineId, occurrenceDate, completed) {
  validateId(routineId, 'routineId')
  const date = validateDate(occurrenceDate, 'date')
  if (typeof completed !== 'boolean') throw new RoutineServiceError('completed must be a boolean', 400)
  const result = await pool.query(
    `INSERT INTO public.routine_occurrences (routine_id, user_id, occurrence_date, completed_at)
     SELECT r.id, r.user_id, $3, CASE WHEN $4 THEN NOW() ELSE NULL END
     FROM public.daily_routines r WHERE r.id = $1 AND r.user_id = $2
       AND EXTRACT(DOW FROM $3::date)::int = ANY(r.days_of_week)
     ON CONFLICT (routine_id, occurrence_date) DO UPDATE
       SET completed_at = CASE WHEN $4 THEN COALESCE(routine_occurrences.completed_at, NOW()) ELSE NULL END,
           updated_at = NOW()
     RETURNING id, routine_id, user_id, occurrence_date::text AS occurrence_date, completed_at`,
    [routineId, userId, date, completed],
  )
  if (!result.rowCount) throw new RoutineServiceError('Routine not found', 404)
  return result.rows[0]
}