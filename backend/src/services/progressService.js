import { pool } from '../config/database.js'
import { calculateGoalProgress, validateProgressGoalId } from './progressCalculator.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ProgressServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ProgressServiceError'
    this.status = status
  }
}

function validateGoalId(goalId) {
  if (typeof goalId !== 'string' || !UUID_PATTERN.test(goalId)) {
    throw new ProgressServiceError('Goal ID must be a valid UUID', 400)
  }
  validateProgressGoalId(goalId)
  return goalId
}

export async function getGoalProgress(userId, goalId) {
  validateGoalId(goalId)
  const goalResult = await pool.query(
    'SELECT id, title FROM public.goals WHERE id = $1 AND user_id = $2 LIMIT 1',
    [goalId, userId],
  )
  if (!goalResult.rowCount) throw new ProgressServiceError('Goal not found', 404)

  const roadmapResult = await pool.query(
    'SELECT id FROM public.roadmaps WHERE goal_id = $1 LIMIT 1',
    [goalId],
  )
  if (!roadmapResult.rowCount) {
    return {
      goal: { ...goalResult.rows[0], progress: 0, hasEvidence: false, state: 'no_evidence' },
      milestones: [],
    }
  }

  const milestoneResult = await pool.query(
    `SELECT id, title FROM public.milestones
     WHERE roadmap_id = $1 ORDER BY position ASC`,
    [roadmapResult.rows[0].id],
  )
  const milestones = milestoneResult.rows
  if (!milestones.length) {
    return {
      goal: { ...goalResult.rows[0], progress: 0, hasEvidence: false, state: 'no_evidence' },
      milestones: [],
    }
  }

  const milestoneIds = milestones.map((milestone) => milestone.id)
  const skillResult = await pool.query(
    `SELECT id, milestone_id, name, status
     FROM public.skills
     WHERE milestone_id = ANY($1::uuid[])
     ORDER BY milestone_id, position ASC`,
    [milestoneIds],
  )
  const skillsByMilestone = new Map()
  for (const skill of skillResult.rows) {
    const skills = skillsByMilestone.get(skill.milestone_id) || []
    skills.push(skill)
    skillsByMilestone.set(skill.milestone_id, skills)
  }

  const hierarchy = milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    skills: (skillsByMilestone.get(milestone.id) || []).map((skill) => ({
      id: skill.id,
      title: skill.name,
      status: skill.status,
    })),
  }))
  const goal = calculateGoalProgress({
    id: goalResult.rows[0].id,
    title: goalResult.rows[0].title,
    milestones: hierarchy,
  })

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      hasEvidence: goal.hasEvidence,
      state: goal.state,
    },
    milestones: goal.milestones,
  }
}