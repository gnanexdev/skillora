const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function progressState(progress, hasEvidence) {
  if (!hasEvidence) return 'no_evidence'
  if (progress === 100) return 'completed'
  if (progress > 0) return 'in_progress'
  return 'started'
}

function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
}

export function calculateSkillProgress(skill) {
  const isCompleted = skill?.status === 'completed'
  const progress = isCompleted ? 100 : 0

  return {
    id: skill?.id,
    title: skill?.title || skill?.name || null,
    progress,
    hasEvidence: Boolean(skill?.id),
    state: isCompleted ? 'completed' : 'incomplete',
    status: isCompleted ? 'completed' : 'pending',
  }
}

export function calculateMilestoneProgress(milestone) {
  const skills = Array.isArray(milestone?.skills) ? milestone.skills.map(calculateSkillProgress) : []
  const completedSkills = skills.filter((skill) => skill.state === 'completed').length
  const hasEvidence = skills.length > 0
  const progress = hasEvidence ? Math.round((completedSkills / skills.length) * 100) : 0
  const isCompleted = hasEvidence && completedSkills === skills.length

  return {
    id: milestone?.id,
    title: milestone?.title || null,
    progress,
    hasEvidence,
    state: isCompleted ? 'completed' : hasEvidence && completedSkills > 0 ? 'in_progress' : hasEvidence ? 'started' : 'no_evidence',
    status: isCompleted ? 'completed' : completedSkills > 0 ? 'active' : 'pending',
    skills,
  }
}

export function calculateGoalProgress(goal) {
  const milestones = Array.isArray(goal?.milestones) ? goal.milestones.map(calculateMilestoneProgress) : []
  const completedMilestones = milestones.filter((milestone) => milestone.status === 'completed').length
  const hasEvidence = milestones.some((milestone) => milestone.hasEvidence)
  const progress = milestones.length ? Math.round((completedMilestones / milestones.length) * 100) : 0

  return {
    id: goal?.id,
    title: goal?.title || null,
    progress,
    hasEvidence,
    state: progressState(progress, hasEvidence),
    completedMilestones,
    totalMilestones: milestones.length,
    milestones,
  }
}

export function validateProgressGoalId(goalId) {
  if (typeof goalId !== 'string' || !UUID_PATTERN.test(goalId)) {
    throw new TypeError('Goal ID must be a valid UUID')
  }
  return goalId
}
