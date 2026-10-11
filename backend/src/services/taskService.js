import { pool } from '../config/database.js'
import { evaluateTaskCompletion } from './achievementService.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TASK_STATUSES = new Set(['pending', 'in_progress', 'completed', 'skipped'])
const TASK_PRIORITIES = new Set(['low', 'medium', 'high'])
const TASK_FIELDS = `t.id, t.user_id, t.weekly_plan_id, t.goal_id, t.skill_id,
  t.title, t.description, t.due_date::text AS due_date, t.estimated_minutes, t.priority, t.status,
  t.completed_at, t.created_at, t.updated_at,
  g.title AS goal_title, s.name AS skill_name`

export class TaskServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'TaskServiceError'
    this.status = status
  }
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TaskServiceError(`${field} must be a valid UUID`, 400)
  return value
}

function validateBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TaskServiceError('Request body must be an object', 400)
  return input
}

function validateText(value, field, maximum, required = false) {
  if (value === null && !required) return null
  if (typeof value !== 'string') throw new TaskServiceError(`${field} must be a string`, 400)
  const text = value.trim()
  if (required && !text) throw new TaskServiceError(`${field} is required`, 400)
  if (text.length > maximum) throw new TaskServiceError(`${field} must be ${maximum} characters or fewer`, 400)
  return text || null
}

function validateDate(value, field) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TaskServiceError(`${field} must use YYYY-MM-DD format`, 400)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new TaskServiceError(`${field} must be a valid calendar date`, 400)
  return value
}

function validateStatus(value) {
  if (typeof value !== 'string' || !TASK_STATUSES.has(value)) throw new TaskServiceError('status must be pending, in_progress, completed, or skipped', 400)
  return value
}

function validatePriority(value) {
  if (typeof value !== 'string' || !TASK_PRIORITIES.has(value)) throw new TaskServiceError('priority must be low, medium, or high', 400)
  return value
}

function validateMinutes(value) {
  if (value === null || value === '') return null
  const minutes = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 10080) throw new TaskServiceError('estimated_minutes must be a positive integer no greater than 10080', 400)
  return minutes
}

async function requireOwnedWeeklyPlan(userId, planId) {
  validateId(planId, 'weekly_plan_id')
  const result = await pool.query('SELECT id FROM public.weekly_plans WHERE id = $1 AND user_id = $2 LIMIT 1', [planId, userId])
  if (!result.rowCount) throw new TaskServiceError('Weekly plan not found', 404)
}

async function requireOwnedGoal(userId, goalId) {
  if (goalId === null) return
  validateId(goalId, 'goal_id')
  const result = await pool.query('SELECT id FROM public.goals WHERE id = $1 AND user_id = $2 LIMIT 1', [goalId, userId])
  if (!result.rowCount) throw new TaskServiceError('Goal not found', 404)
}

async function requireOwnedSkill(userId, skillId, goalId = null) {
  if (skillId === null) return
  validateId(skillId, 'skill_id')
  const values = [skillId, userId]
  let goalClause = ''
  if (goalId !== null) {
    validateId(goalId, 'goal_id')
    values.push(goalId)
    goalClause = ' AND g.id = $3'
  }
  const result = await pool.query(
    `SELECT s.id
     FROM public.skills s
     JOIN public.milestones m ON m.id = s.milestone_id
     JOIN public.roadmaps r ON r.id = m.roadmap_id
     JOIN public.goals g ON g.id = r.goal_id
     WHERE s.id = $1 AND g.user_id = $2${goalClause}
     LIMIT 1`,
    values,
  )
  if (!result.rowCount) throw new TaskServiceError('Skill not found', 404)
}

async function getOwnedTask(userId, taskId) {
  validateId(taskId, 'taskId')
  const result = await pool.query(
    `SELECT ${TASK_FIELDS}
     FROM public.tasks t
     LEFT JOIN public.goals g ON g.id = t.goal_id
     LEFT JOIN public.skills s ON s.id = t.skill_id
     WHERE t.id = $1 AND t.user_id = $2
     LIMIT 1`,
    [taskId, userId],
  )
  if (!result.rowCount) throw new TaskServiceError('Task not found', 404)
  return result.rows[0]
}

export async function listTasks(userId, filters = {}) {
  const conditions = ['t.user_id = $1']
  const values = [userId]
  if (filters.weekly_plan_id !== undefined) {
    validateId(filters.weekly_plan_id, 'weekly_plan_id')
    conditions.push(`t.weekly_plan_id = $${values.push(filters.weekly_plan_id)}`)
  }
  if (filters.status !== undefined && filters.status !== 'all') conditions.push(`t.status = $${values.push(validateStatus(filters.status))}`)
  if (filters.priority !== undefined && filters.priority !== 'all') conditions.push(`t.priority = $${values.push(validatePriority(filters.priority))}`)
  if (filters.goal_id !== undefined && filters.goal_id !== 'all') {
    validateId(filters.goal_id, 'goal_id')
    conditions.push(`t.goal_id = $${values.push(filters.goal_id)}`)
  }
  if (filters.due_date !== undefined) conditions.push(`t.due_date = $${values.push(validateDate(filters.due_date, 'due_date'))}`)
  const result = await pool.query(
    `SELECT ${TASK_FIELDS}
     FROM public.tasks t
     LEFT JOIN public.goals g ON g.id = t.goal_id
     LEFT JOIN public.skills s ON s.id = t.skill_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.due_date ASC NULLS LAST, t.priority DESC, t.created_at ASC`,
    values,
  )
  return result.rows
}

export async function listWeeklyPlanTasks(userId, planId) {
  await requireOwnedWeeklyPlan(userId, planId)
  return listTasks(userId, { weekly_plan_id: planId })
}

export async function getTask(userId, taskId) {
  return getOwnedTask(userId, taskId)
}

function validateCreateBody(input) {
  const body = validateBody(input)
  const allowed = ['weekly_plan_id', 'goal_id', 'skill_id', 'title', 'description', 'due_date', 'estimated_minutes', 'priority', 'status']
  const unknown = Object.keys(body).find((field) => !allowed.includes(field))
  if (unknown) throw new TaskServiceError(`Field ${unknown} cannot be set`, 400)
  return {
    weekly_plan_id: body.weekly_plan_id === undefined || body.weekly_plan_id === null ? null : validateId(body.weekly_plan_id, 'weekly_plan_id'),
    goal_id: body.goal_id === undefined || body.goal_id === null || body.goal_id === '' ? null : validateId(body.goal_id, 'goal_id'),
    skill_id: body.skill_id === undefined || body.skill_id === null || body.skill_id === '' ? null : validateId(body.skill_id, 'skill_id'),
    title: validateText(body.title, 'title', 200, true),
    description: body.description === undefined ? null : validateText(body.description, 'description', 5000),
    due_date: body.due_date === undefined ? null : validateDate(body.due_date, 'due_date'),
    estimated_minutes: body.estimated_minutes === undefined ? null : validateMinutes(body.estimated_minutes),
    priority: body.priority === undefined ? 'medium' : validatePriority(body.priority),
    status: body.status === undefined ? 'pending' : validateStatus(body.status),
  }
}

export async function createTask(userId, input) {
  const task = validateCreateBody(input)
  if (task.weekly_plan_id) await requireOwnedWeeklyPlan(userId, task.weekly_plan_id)
  await requireOwnedGoal(userId, task.goal_id)
  await requireOwnedSkill(userId, task.skill_id, task.goal_id)
  if (task.skill_id && task.goal_id) {
    const parent = await pool.query(
      `SELECT g.id FROM public.skills s JOIN public.milestones m ON m.id=s.milestone_id
       JOIN public.roadmaps r ON r.id=m.roadmap_id JOIN public.goals g ON g.id=r.goal_id
       WHERE s.id=$1 AND g.id=$2 AND g.user_id=$3`,
      [task.skill_id, task.goal_id, userId],
    )
    if (!parent.rowCount) throw new TaskServiceError('Skill does not belong to the selected goal', 400)
  }
  const completedAtValue = task.status === 'completed' ? 'NOW()' : 'NULL'
  const result = await pool.query(
    `INSERT INTO public.tasks
       (user_id, weekly_plan_id, goal_id, skill_id, title, description, due_date, estimated_minutes, priority, status, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,${completedAtValue})
     RETURNING id, user_id, weekly_plan_id, goal_id, skill_id, title, description, due_date, estimated_minutes, priority, status, completed_at, created_at, updated_at`,
    [userId, task.weekly_plan_id, task.goal_id, task.skill_id, task.title, task.description, task.due_date, task.estimated_minutes, task.priority, task.status],
  )
  const createdTask = await getOwnedTask(userId, result.rows[0].id)
  if (createdTask.status === 'completed') await evaluateTaskCompletion(userId, createdTask.id)
  return createdTask
}

export async function updateTask(userId, taskId, input) {
  const current = await getOwnedTask(userId, taskId)
  const body = validateBody(input)
  const fields = {
    weekly_plan_id: (value) => value === null || value === '' ? null : validateId(value, 'weekly_plan_id'),
    goal_id: (value) => value === null || value === '' ? null : validateId(value, 'goal_id'),
    skill_id: (value) => value === null || value === '' ? null : validateId(value, 'skill_id'),
    title: (value) => validateText(value, 'title', 200, true),
    description: (value) => validateText(value, 'description', 5000),
    due_date: (value) => validateDate(value, 'due_date'),
    estimated_minutes: validateMinutes,
    priority: validatePriority,
    status: validateStatus,
  }
  const unknown = Object.keys(body).find((field) => !Object.hasOwn(fields, field))
  if (unknown) throw new TaskServiceError(`Field ${unknown} cannot be changed`, 400)
  const updates = Object.entries(fields)
    .filter(([field]) => Object.hasOwn(body, field))
    .map(([field, validate]) => [field, validate(body[field])])
  if (!updates.length) throw new TaskServiceError('At least one editable field is required', 400)

  const changed = Object.fromEntries(updates)
  const weeklyPlanId = Object.hasOwn(changed, 'weekly_plan_id') ? changed.weekly_plan_id : current.weekly_plan_id
  const goalId = Object.hasOwn(changed, 'goal_id') ? changed.goal_id : current.goal_id
  const skillId = Object.hasOwn(changed, 'skill_id') ? changed.skill_id : current.skill_id
  if (weeklyPlanId) await requireOwnedWeeklyPlan(userId, weeklyPlanId)
  await requireOwnedGoal(userId, goalId)
  await requireOwnedSkill(userId, skillId, goalId)
  if (skillId && goalId) {
    const relationship = await pool.query(
      `SELECT 1 FROM public.skills s JOIN public.milestones m ON m.id=s.milestone_id
       JOIN public.roadmaps r ON r.id=m.roadmap_id JOIN public.goals g ON g.id=r.goal_id
       WHERE s.id=$1 AND g.id=$2 AND g.user_id=$3`,
      [skillId, goalId, userId],
    )
    if (!relationship.rowCount) throw new TaskServiceError('Skill does not belong to the selected goal', 400)
  }

  const assignments = updates.map(([field], index) => `${field} = $${index + 3}`)
  const values = [taskId, userId, ...updates.map(([, value]) => value)]
  const statusUpdate = Object.hasOwn(changed, 'status')
  const completedAtSql = statusUpdate
    ? `, completed_at = CASE WHEN $${values.length}::varchar = 'completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END`
    : ''
  const result = await pool.query(
    `UPDATE public.tasks
     SET ${assignments.join(', ')}, updated_at = NOW()${completedAtSql}
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    values,
  )
  if (!result.rowCount) throw new TaskServiceError('Task not found', 404)
  const updatedTask = await getOwnedTask(userId, taskId)
  if (statusUpdate && updatedTask.status === 'completed') await evaluateTaskCompletion(userId, updatedTask.id)
  return updatedTask
}

export async function deleteTask(userId, taskId) {
  validateId(taskId, 'taskId')
  const result = await pool.query('DELETE FROM public.tasks WHERE id=$1 AND user_id=$2 RETURNING id', [taskId, userId])
  if (!result.rowCount) throw new TaskServiceError('Task not found', 404)
}