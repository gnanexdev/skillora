import { pool } from '../config/database.js'
import { calculateGoalProgress } from './progressCalculator.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MILESTONE_STATUSES = new Set(['pending', 'active', 'completed'])
const SKILL_STATUSES = new Set(['pending', 'learning', 'completed'])
const ROADMAP_FIELDS = 'id, goal_id, title, description, created_at, updated_at'
const MILESTONE_FIELDS = 'id, roadmap_id, title, description, position, status, progress_percentage, created_at, updated_at'
const SKILL_FIELDS = 'id, milestone_id, name, description, position, status, progress_percentage, created_at, updated_at'

export class RoadmapServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'RoadmapServiceError'
    this.status = status
  }
}

function validateId(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new RoadmapServiceError(`${field} must be a valid UUID`, 400)
  }
  return value
}

function validateBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new RoadmapServiceError('Request body must be an object', 400)
  }
  return input
}

function validateText(value, field, maximum, { required = false } = {}) {
  if (value === null && !required) return null
  if (typeof value !== 'string') throw new RoadmapServiceError(`${field} must be a string`, 400)
  const clean = value.trim()
  if (required && !clean) throw new RoadmapServiceError(`${field} is required`, 400)
  if (clean.length > maximum) throw new RoadmapServiceError(`${field} must be ${maximum} characters or fewer`, 400)
  return clean || null
}

function validatePosition(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RoadmapServiceError('position must be a positive integer', 400)
  }
  return value
}

function validateProgress(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new RoadmapServiceError('progress_percentage must be an integer from 0 to 100', 400)
  }
  return value
}

function validateStatus(value, allowed, field = 'status') {
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new RoadmapServiceError(`${field} has an unsupported value`, 400)
  }
  return value
}

function rejectUnknownFields(input, allowed) {
  const unknownField = Object.keys(input).find((key) => !allowed.includes(key))
  if (unknownField) throw new RoadmapServiceError(`Field ${unknownField} cannot be changed`, 400)
}

function conflictFrom(error) {
  if (error.code === '23505') {
    throw new RoadmapServiceError('That position is already in use', 409)
  }
  throw error
}

async function requireOwnedGoal(userId, goalId) {
  validateId(goalId, 'goalId')
  const result = await pool.query('SELECT id FROM public.goals WHERE id = $1 AND user_id = $2 LIMIT 1', [goalId, userId])
  if (!result.rowCount) throw new RoadmapServiceError('Goal not found', 404)
}

async function getOwnedRoadmap(userId, roadmapId) {
  validateId(roadmapId, 'roadmapId')
  const result = await pool.query(
    `SELECT r.${ROADMAP_FIELDS.replaceAll(', ', ', r.')}
     FROM public.roadmaps r
     JOIN public.goals g ON g.id = r.goal_id
     WHERE r.id = $1 AND g.user_id = $2
     LIMIT 1`,
    [roadmapId, userId],
  )
  if (!result.rowCount) throw new RoadmapServiceError('Roadmap not found', 404)
  return result.rows[0]
}

async function getOwnedMilestone(userId, milestoneId) {
  validateId(milestoneId, 'milestoneId')
  const result = await pool.query(
    `SELECT m.${MILESTONE_FIELDS.replaceAll(', ', ', m.')}
     FROM public.milestones m
     JOIN public.roadmaps r ON r.id = m.roadmap_id
     JOIN public.goals g ON g.id = r.goal_id
     WHERE m.id = $1 AND g.user_id = $2
     LIMIT 1`,
    [milestoneId, userId],
  )
  if (!result.rowCount) throw new RoadmapServiceError('Milestone not found', 404)
  return result.rows[0]
}

async function getOwnedSkill(userId, skillId) {
  validateId(skillId, 'skillId')
  const result = await pool.query(
    `SELECT s.${SKILL_FIELDS.replaceAll(', ', ', s.')}
     FROM public.skills s
     JOIN public.milestones m ON m.id = s.milestone_id
     JOIN public.roadmaps r ON r.id = m.roadmap_id
     JOIN public.goals g ON g.id = r.goal_id
     WHERE s.id = $1 AND g.user_id = $2
     LIMIT 1`,
    [skillId, userId],
  )
  if (!result.rowCount) throw new RoadmapServiceError('Skill not found', 404)
  return result.rows[0]
}

export async function getGoalRoadmap(userId, goalId) {
  await requireOwnedGoal(userId, goalId)
  const roadmapResult = await pool.query(
    `SELECT ${ROADMAP_FIELDS}
     FROM public.roadmaps
     WHERE goal_id = $1
     LIMIT 1`,
    [goalId],
  )
  if (!roadmapResult.rowCount) return null

  const roadmap = roadmapResult.rows[0]
  const milestonesResult = await pool.query(
    `SELECT ${MILESTONE_FIELDS}
     FROM public.milestones
     WHERE roadmap_id = $1
     ORDER BY position ASC`,
    [roadmap.id],
  )
  const milestones = milestonesResult.rows
  if (!milestones.length) return { ...roadmap, progress_percentage: 0, milestones: [] }

  const skillsResult = await pool.query(
    `SELECT ${SKILL_FIELDS}
     FROM public.skills
     WHERE milestone_id = ANY($1::uuid[])
     ORDER BY position ASC`,
    [milestones.map((milestone) => milestone.id)],
  )
  const skillsByMilestone = new Map()
  for (const skill of skillsResult.rows) {
    const milestoneSkills = skillsByMilestone.get(skill.milestone_id) || []
    milestoneSkills.push(skill)
    skillsByMilestone.set(skill.milestone_id, milestoneSkills)
  }
  const roadmapMilestones = milestones.map((milestone) => ({
    ...milestone,
    skills: skillsByMilestone.get(milestone.id) || [],
  }))
  const derived = calculateGoalProgress({ milestones: roadmapMilestones })
  return {
    ...roadmap,
    progress_percentage: derived.progress,
    milestones: roadmapMilestones.map((milestone, index) => ({
      ...milestone,
      status: derived.milestones[index].status,
      progress_percentage: derived.milestones[index].progress,
      skills: milestone.skills.map((skill, skillIndex) => ({
        ...skill,
        status: derived.milestones[index].skills[skillIndex].status,
        progress_percentage: derived.milestones[index].skills[skillIndex].progress,
      })),
    })),
  }
}

export async function createRoadmap(userId, goalId, input) {
  await requireOwnedGoal(userId, goalId)
  const body = validateBody(input)
  rejectUnknownFields(body, ['title', 'description'])
  const title = validateText(body.title, 'title', 160, { required: true })
  const description = body.description === undefined ? null : validateText(body.description, 'description', 5000)
  try {
    const result = await pool.query(
      `INSERT INTO public.roadmaps (goal_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING ${ROADMAP_FIELDS}`,
      [goalId, title, description],
    )
    return { ...result.rows[0], milestones: [] }
  } catch (error) {
    if (error.code === '23505') throw new RoadmapServiceError('A roadmap already exists for this goal', 409)
    throw error
  }
}

export async function updateRoadmap(userId, roadmapId, input) {
  await getOwnedRoadmap(userId, roadmapId)
  const body = validateBody(input)
  rejectUnknownFields(body, ['title', 'description'])
  const updates = []
  if (Object.hasOwn(body, 'title')) updates.push(['title', validateText(body.title, 'title', 160, { required: true })])
  if (Object.hasOwn(body, 'description')) updates.push(['description', validateText(body.description, 'description', 5000)])
  if (!updates.length) throw new RoadmapServiceError('At least one editable field is required', 400)
  const assignments = updates.map(([field], index) => `${field} = $${index + 3}`)
  const result = await pool.query(
    `UPDATE public.roadmaps r
     SET ${assignments.join(', ')}, updated_at = NOW()
     FROM public.goals g
     WHERE r.id = $1 AND r.goal_id = g.id AND g.user_id = $2
     RETURNING r.${ROADMAP_FIELDS.replaceAll(', ', ', r.')}`,
    [roadmapId, userId, ...updates.map(([, value]) => value)],
  )
  if (!result.rowCount) throw new RoadmapServiceError('Roadmap not found', 404)
  return result.rows[0]
}

export async function deleteRoadmap(userId, roadmapId) {
  await getOwnedRoadmap(userId, roadmapId)
  await pool.query(
    `DELETE FROM public.roadmaps r
     USING public.goals g
     WHERE r.id = $1 AND r.goal_id = g.id AND g.user_id = $2`,
    [roadmapId, userId],
  )
}

export async function createMilestone(userId, roadmapId, input) {
  await getOwnedRoadmap(userId, roadmapId)
  const body = validateBody(input)
  rejectUnknownFields(body, ['title', 'description', 'position'])
  const title = validateText(body.title, 'title', 160, { required: true })
  const description = body.description === undefined ? null : validateText(body.description, 'description', 5000)
  const position = validatePosition(body.position)
  try {
    const result = await pool.query(
      `INSERT INTO public.milestones (roadmap_id, title, description, position)
       VALUES ($1, $2, $3, $4)
       RETURNING ${MILESTONE_FIELDS}`,
      [roadmapId, title, description, position],
    )
    return { ...result.rows[0], skills: [] }
  } catch (error) {
    conflictFrom(error)
  }
}

export async function updateMilestone(userId, milestoneId, input) {
  await getOwnedMilestone(userId, milestoneId)
  const body = validateBody(input)
  rejectUnknownFields(body, ['title', 'description', 'position'])
  const updates = []
  if (Object.hasOwn(body, 'title')) updates.push(['title', validateText(body.title, 'title', 160, { required: true })])
  if (Object.hasOwn(body, 'description')) updates.push(['description', validateText(body.description, 'description', 5000)])
  if (Object.hasOwn(body, 'position')) updates.push(['position', validatePosition(body.position)])
  if (!updates.length) throw new RoadmapServiceError('At least one editable field is required', 400)
  const assignments = updates.map(([field], index) => `${field} = $${index + 3}`)
  try {
    const result = await pool.query(
      `UPDATE public.milestones m
       SET ${assignments.join(', ')}, updated_at = NOW()
       FROM public.roadmaps r JOIN public.goals g ON g.id = r.goal_id
       WHERE m.id = $1 AND m.roadmap_id = r.id AND g.user_id = $2
       RETURNING m.${MILESTONE_FIELDS.replaceAll(', ', ', m.')}`,
      [milestoneId, userId, ...updates.map(([, value]) => value)],
    )
    if (!result.rowCount) throw new RoadmapServiceError('Milestone not found', 404)
    return result.rows[0]
  } catch (error) {
    conflictFrom(error)
  }
}

export async function deleteMilestone(userId, milestoneId) {
  await getOwnedMilestone(userId, milestoneId)
  await pool.query(
    `DELETE FROM public.milestones m
     USING public.roadmaps r, public.goals g
     WHERE m.id = $1 AND m.roadmap_id = r.id AND r.goal_id = g.id AND g.user_id = $2`,
    [milestoneId, userId],
  )
}

export async function createSkill(userId, milestoneId, input) {
  await getOwnedMilestone(userId, milestoneId)
  const body = validateBody(input)
  rejectUnknownFields(body, ['name', 'description', 'position'])
  const name = validateText(body.name, 'name', 160, { required: true })
  const description = body.description === undefined ? null : validateText(body.description, 'description', 5000)
  const position = validatePosition(body.position)
  try {
    const result = await pool.query(
      `INSERT INTO public.skills (milestone_id, name, description, position)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SKILL_FIELDS}`,
      [milestoneId, name, description, position],
    )
    return result.rows[0]
  } catch (error) {
    conflictFrom(error)
  }
}

export async function updateSkill(userId, skillId, input) {
  await getOwnedSkill(userId, skillId)
  const body = validateBody(input)
  rejectUnknownFields(body, ['name', 'description', 'position'])
  const updates = []
  if (Object.hasOwn(body, 'name')) updates.push(['name', validateText(body.name, 'name', 160, { required: true })])
  if (Object.hasOwn(body, 'description')) updates.push(['description', validateText(body.description, 'description', 5000)])
  if (Object.hasOwn(body, 'position')) updates.push(['position', validatePosition(body.position)])
  if (!updates.length) throw new RoadmapServiceError('At least one editable field is required', 400)
  const assignments = updates.map(([field], index) => `${field} = $${index + 3}`)
  try {
    const result = await pool.query(
      `UPDATE public.skills s
       SET ${assignments.join(', ')}, updated_at = NOW()
       FROM public.milestones m
       JOIN public.roadmaps r ON r.id = m.roadmap_id
       JOIN public.goals g ON g.id = r.goal_id
       WHERE s.id = $1 AND s.milestone_id = m.id AND g.user_id = $2
       RETURNING s.${SKILL_FIELDS.replaceAll(', ', ', s.')}`,
      [skillId, userId, ...updates.map(([, value]) => value)],
    )
    if (!result.rowCount) throw new RoadmapServiceError('Skill not found', 404)
    return result.rows[0]
  } catch (error) {
    conflictFrom(error)
  }
}

export async function setSkillCompletion(userId, skillId, completed) {
  await getOwnedSkill(userId, skillId)
  if (typeof completed !== 'boolean') throw new RoadmapServiceError('completed must be a boolean', 400)
  const result = await pool.query(
    `UPDATE public.skills s
     SET status = $3, updated_at = NOW()
     FROM public.milestones m
     JOIN public.roadmaps r ON r.id = m.roadmap_id
     JOIN public.goals g ON g.id = r.goal_id
     WHERE s.id = $1 AND s.milestone_id = m.id AND g.user_id = $2
     RETURNING s.${SKILL_FIELDS.replaceAll(', ', ', s.')}`,
    [skillId, userId, completed ? 'completed' : 'pending'],
  )
  if (!result.rowCount) throw new RoadmapServiceError('Skill not found', 404)
  return result.rows[0]
}

export async function deleteSkill(userId, skillId) {
  await getOwnedSkill(userId, skillId)
  await pool.query(
    `DELETE FROM public.skills s
     USING public.milestones m, public.roadmaps r, public.goals g
     WHERE s.id = $1 AND s.milestone_id = m.id AND m.roadmap_id = r.id AND r.goal_id = g.id AND g.user_id = $2`,
    [skillId, userId],
  )
}