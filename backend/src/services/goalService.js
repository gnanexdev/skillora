import { pool } from '../config/database.js'
import { evaluateGoalCompletion } from './achievementService.js'

const GOAL_FIELDS = `id, user_id, title, description, category, target_date,
  status, progress_percentage, priority, completed_at, created_at, updated_at`
const PRIORITIES = new Set(['low', 'medium', 'high'])
const STATUSES = new Set(['active', 'paused', 'completed', 'archived'])
const MAX_TITLE_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_CATEGORY_LENGTH = 80
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class GoalServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GoalServiceError'
    this.status = status
  }
}

function validateString(value, field, maximum, { required = false } = {}) {
  if (value === null && !required) return null
  if (typeof value !== 'string') {
    throw new GoalServiceError(`${field} must be a string`, 400)
  }
  const cleanValue = value.trim()
  if (required && !cleanValue) throw new GoalServiceError(`${field} is required`, 400)
  if (cleanValue.length > maximum) {
    throw new GoalServiceError(`${field} must be ${maximum} characters or fewer`, 400)
  }
  return cleanValue || null
}

function validateDate(value) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new GoalServiceError('target_date must use YYYY-MM-DD format', 400)
  }
  const parsedDate = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw new GoalServiceError('target_date must be a valid calendar date', 400)
  }
  return value
}

function validatePriority(value) {
  if (typeof value !== 'string' || !PRIORITIES.has(value)) {
    throw new GoalServiceError('priority must be low, medium, or high', 400)
  }
  return value
}

function validateStatus(value) {
  if (typeof value !== 'string' || !STATUSES.has(value)) {
    throw new GoalServiceError('status must be active, paused, completed, or archived', 400)
  }
  return value
}

function validateGoalId(goalId) {
  if (typeof goalId !== 'string' || !UUID_PATTERN.test(goalId)) {
    throw new GoalServiceError('Goal ID must be a valid UUID', 400)
  }
  return goalId
}

function validateCreateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new GoalServiceError('Request body must be an object', 400)
  }
  return {
    title: validateString(input.title, 'title', MAX_TITLE_LENGTH, { required: true }),
    description: input.description === undefined ? null : validateString(input.description, 'description', MAX_DESCRIPTION_LENGTH),
    category: input.category === undefined ? null : validateString(input.category, 'category', MAX_CATEGORY_LENGTH),
    target_date: input.target_date === undefined ? null : validateDate(input.target_date),
    priority: input.priority === undefined ? 'medium' : validatePriority(input.priority),
  }
}

export async function listGoals(userId, filters = {}) {
  const conditions = ['user_id = $1']
  const values = [userId]

  if (filters.status !== undefined) {
    conditions.push(`status = $${values.push(validateStatus(filters.status))}`)
  }
  if (filters.priority !== undefined) {
    conditions.push(`priority = $${values.push(validatePriority(filters.priority))}`)
  }

  const result = await pool.query(
    `SELECT ${GOAL_FIELDS}
     FROM public.goals
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
       CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       target_date ASC NULLS LAST,
       created_at DESC`,
    values,
  )
  return result.rows
}

export async function getGoal(userId, goalId) {
  validateGoalId(goalId)
  const result = await pool.query(
    `SELECT ${GOAL_FIELDS}
     FROM public.goals
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [goalId, userId],
  )
  if (!result.rowCount) throw new GoalServiceError('Goal not found', 404)
  return result.rows[0]
}

export async function createGoal(userId, input) {
  const goal = validateCreateInput(input)
  const result = await pool.query(
    `INSERT INTO public.goals (user_id, title, description, category, target_date, priority)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${GOAL_FIELDS}`,
    [userId, goal.title, goal.description, goal.category, goal.target_date, goal.priority],
  )
  return result.rows[0]
}

export async function updateGoal(userId, goalId, input) {
  validateGoalId(goalId)
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new GoalServiceError('Request body must be an object', 400)
  }

  const fields = {
    title: (value) => validateString(value, 'title', MAX_TITLE_LENGTH, { required: true }),
    description: (value) => validateString(value, 'description', MAX_DESCRIPTION_LENGTH),
    category: (value) => validateString(value, 'category', MAX_CATEGORY_LENGTH),
    target_date: validateDate,
    priority: validatePriority,
    status: validateStatus,
  }
  const updates = Object.entries(fields)
    .filter(([field]) => Object.hasOwn(input, field))
    .map(([field, validate]) => [field, validate(input[field])])

  if (!updates.length) throw new GoalServiceError('At least one editable field is required', 400)

  const requestedStatus = Object.hasOwn(input, 'status')
  if (requestedStatus) {
    const existing = await pool.query('SELECT status FROM public.goals WHERE id = $1 AND user_id = $2 LIMIT 1', [goalId, userId])
    if (!existing.rowCount) throw new GoalServiceError('Goal not found', 404)
  }

  const assignments = updates.map(([field], index) => `${field} = $${index + 3}`)
  const values = [goalId, userId, ...updates.map(([, value]) => value)]
  if (requestedStatus) {
    const statusParameter = values.length
    assignments.push(`completed_at = CASE
      WHEN $${statusParameter}::varchar = 'completed' AND status <> 'completed' THEN NOW()
      WHEN $${statusParameter}::varchar <> 'completed' THEN NULL
      ELSE completed_at
    END`)
  }
  const result = await pool.query(
    `UPDATE public.goals
     SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING ${GOAL_FIELDS}`,
    values,
  )
  if (!result.rowCount) throw new GoalServiceError('Goal not found', 404)
  if (requestedStatus && result.rows[0].status === 'completed') await evaluateGoalCompletion(userId, goalId)
  return result.rows[0]
}

export async function deleteGoal(userId, goalId) {
  validateGoalId(goalId)
  const result = await pool.query(
    'DELETE FROM public.goals WHERE id = $1 AND user_id = $2 RETURNING id',
    [goalId, userId],
  )
  if (!result.rowCount) throw new GoalServiceError('Goal not found', 404)
}