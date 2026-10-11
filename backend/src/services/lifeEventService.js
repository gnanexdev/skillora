import { pool } from '../config/database.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENT_TYPES = new Set(['exam', 'travel', 'family', 'college', 'event', 'holiday', 'personal', 'other'])
const IMPACT_LEVELS = new Set(['low', 'medium', 'high'])
const EVENT_FIELDS = 'id, user_id, title, description, event_type, start_date::text AS start_date, end_date::text AS end_date, impact_level, estimated_daily_impact_minutes, created_at, updated_at'
const DEFAULT_IMPACT = { low: 60, medium: 180, high: 360 }

export class LifeEventServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'LifeEventServiceError'
    this.status = status
  }
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new LifeEventServiceError(`${field} must be a valid UUID`, 400)
  return value
}

function validateDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new LifeEventServiceError(`${field} must use YYYY-MM-DD format`, 400)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new LifeEventServiceError(`${field} must be a valid calendar date`, 400)
  return value
}

function validateBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LifeEventServiceError('Request body must be an object', 400)
  return input
}

function validateEvent(input, partial = false) {
  const body = validateBody(input)
  const allowed = ['title', 'description', 'event_type', 'start_date', 'end_date', 'impact_level', 'estimated_daily_impact_minutes']
  const unknown = Object.keys(body).find((key) => !allowed.includes(key))
  if (unknown) throw new LifeEventServiceError(`Field ${unknown} cannot be set`, 400)
  const values = {}
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || !body.title.trim()) throw new LifeEventServiceError('title is required', 400)
    if (body.title.trim().length > 200) throw new LifeEventServiceError('title must be 200 characters or fewer', 400)
    values.title = body.title.trim()
  }
  if (Object.hasOwn(body, 'description')) {
    if (body.description !== null && typeof body.description !== 'string') throw new LifeEventServiceError('description must be a string', 400)
    if (typeof body.description === 'string' && body.description.length > 5000) throw new LifeEventServiceError('description must be 5000 characters or fewer', 400)
    values.description = body.description?.trim() || null
  } else if (!partial) values.description = null
  if (!partial || Object.hasOwn(body, 'event_type')) {
    const eventType = body.event_type ?? 'other'
    if (typeof eventType !== 'string' || !EVENT_TYPES.has(eventType)) throw new LifeEventServiceError('event_type is invalid', 400)
    values.event_type = eventType
  }
  for (const field of ['start_date', 'end_date']) {
    if (!partial || Object.hasOwn(body, field)) values[field] = validateDate(body[field], field)
  }
  if (!partial || Object.hasOwn(body, 'impact_level')) {
    const level = body.impact_level ?? 'medium'
    if (typeof level !== 'string' || !IMPACT_LEVELS.has(level)) throw new LifeEventServiceError('impact_level must be low, medium, or high', 400)
    values.impact_level = level
  }
  if (Object.hasOwn(body, 'estimated_daily_impact_minutes')) {
    const minutes = Number(body.estimated_daily_impact_minutes)
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) throw new LifeEventServiceError('estimated_daily_impact_minutes must be an integer from 0 to 1440', 400)
    values.estimated_daily_impact_minutes = minutes
  }
  if (values.start_date && values.end_date && values.end_date < values.start_date) throw new LifeEventServiceError('end_date cannot be before start_date', 400)
  return values
}

export async function listLifeEvents(userId, filters = {}) {
  const conditions = ['user_id = $1']
  const values = [userId]
  if (filters.start_date !== undefined) {
    const startDate = validateDate(filters.start_date, 'start_date')
    const endDate = filters.end_date === undefined ? startDate : validateDate(filters.end_date, 'end_date')
    if (endDate < startDate) throw new LifeEventServiceError('end_date cannot be before start_date', 400)
    conditions.push(`start_date <= $${values.push(endDate)} AND end_date >= $${values.push(startDate)}`)
  } else if (filters.end_date !== undefined) {
    throw new LifeEventServiceError('start_date is required when filtering by end_date', 400)
  }
  const result = await pool.query(`SELECT ${EVENT_FIELDS} FROM public.life_events WHERE ${conditions.join(' AND ')} ORDER BY start_date ASC, title ASC`, values)
  return result.rows
}

export async function getLifeEvent(userId, eventId) {
  validateId(eventId, 'lifeEventId')
  const result = await pool.query(`SELECT ${EVENT_FIELDS} FROM public.life_events WHERE id = $1 AND user_id = $2 LIMIT 1`, [eventId, userId])
  if (!result.rowCount) throw new LifeEventServiceError('Life event not found', 404)
  return result.rows[0]
}

export async function createLifeEvent(userId, input) {
  const event = validateEvent(input)
  event.estimated_daily_impact_minutes ??= DEFAULT_IMPACT[event.impact_level]
  const result = await pool.query(
    `INSERT INTO public.life_events (user_id, title, description, event_type, start_date, end_date, impact_level, estimated_daily_impact_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${EVENT_FIELDS}`,
    [userId, event.title, event.description, event.event_type, event.start_date, event.end_date, event.impact_level, event.estimated_daily_impact_minutes],
  )
  return result.rows[0]
}

export async function updateLifeEvent(userId, eventId, input) {
  validateId(eventId, 'lifeEventId')
  const updates = validateEvent(input, true)
  if (!Object.keys(updates).length) throw new LifeEventServiceError('At least one editable field is required', 400)
  const currentResult = await pool.query(`SELECT ${EVENT_FIELDS} FROM public.life_events WHERE id = $1 AND user_id = $2`, [eventId, userId])
  if (!currentResult.rowCount) throw new LifeEventServiceError('Life event not found', 404)
  const current = currentResult.rows[0]
  const startDate = updates.start_date ?? current.start_date
  const endDate = updates.end_date ?? current.end_date
  if (endDate < startDate) throw new LifeEventServiceError('end_date cannot be before start_date', 400)
  const entries = Object.entries(updates)
  if (updates.impact_level && !Object.hasOwn(updates, 'estimated_daily_impact_minutes')) {
    entries.push(['estimated_daily_impact_minutes', DEFAULT_IMPACT[updates.impact_level]])
  }
  const assignments = entries.map(([field], index) => `${field} = $${index + 3}`)
  const result = await pool.query(
    `UPDATE public.life_events SET ${assignments.join(', ')}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING ${EVENT_FIELDS}`,
    [eventId, userId, ...entries.map(([, value]) => value)],
  )
  if (!result.rowCount) throw new LifeEventServiceError('Life event not found', 404)
  return result.rows[0]
}

export async function deleteLifeEvent(userId, eventId) {
  validateId(eventId, 'lifeEventId')
  const result = await pool.query('DELETE FROM public.life_events WHERE id = $1 AND user_id = $2 RETURNING id', [eventId, userId])
  if (!result.rowCount) throw new LifeEventServiceError('Life event not found', 404)
}