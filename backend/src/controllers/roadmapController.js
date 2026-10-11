import {
  createMilestone,
  createRoadmap,
  createSkill,
  deleteMilestone,
  deleteRoadmap,
  deleteSkill,
  getGoalRoadmap,
  updateMilestone,
  updateRoadmap,
  updateSkill,
  setSkillCompletion,
} from '../services/roadmapService.js'
import { evaluateRoadmapCompletion } from '../services/achievementService.js'

export async function getRoadmapForGoal(request, response, next) {
  try {
    const roadmap = await getGoalRoadmap(request.auth.userId, request.params.goalId)
    response.status(200).json({ success: true, roadmap })
  } catch (error) {
    next(error)
  }
}

export async function postRoadmap(request, response, next) {
  try {
    const roadmap = await createRoadmap(request.auth.userId, request.params.goalId, request.body)
    response.status(201).json({ success: true, roadmap })
  } catch (error) {
    next(error)
  }
}

export async function patchRoadmap(request, response, next) {
  try {
    const roadmap = await updateRoadmap(request.auth.userId, request.params.roadmapId, request.body)
    response.status(200).json({ success: true, roadmap })
  } catch (error) {
    next(error)
  }
}

export async function removeRoadmap(request, response, next) {
  try {
    await deleteRoadmap(request.auth.userId, request.params.roadmapId)
    response.status(200).json({ success: true, message: 'Roadmap deleted' })
  } catch (error) {
    next(error)
  }
}

export async function postMilestone(request, response, next) {
  try {
    const milestone = await createMilestone(request.auth.userId, request.params.roadmapId, request.body)
    response.status(201).json({ success: true, milestone })
  } catch (error) {
    next(error)
  }
}

export async function patchMilestone(request, response, next) {
  try {
    const milestone = await updateMilestone(request.auth.userId, request.params.milestoneId, request.body)
    response.status(200).json({ success: true, milestone })
  } catch (error) {
    next(error)
  }
}

export async function removeMilestone(request, response, next) {
  try {
    await deleteMilestone(request.auth.userId, request.params.milestoneId)
    response.status(200).json({ success: true, message: 'Milestone deleted' })
  } catch (error) {
    next(error)
  }
}

export async function postSkill(request, response, next) {
  try {
    const skill = await createSkill(request.auth.userId, request.params.milestoneId, request.body)
    response.status(201).json({ success: true, skill })
  } catch (error) {
    next(error)
  }
}

export async function patchSkill(request, response, next) {
  try {
    const skill = await updateSkill(request.auth.userId, request.params.skillId, request.body)
    response.status(200).json({ success: true, skill })
  } catch (error) {
    next(error)
  }
}

export async function patchSkillCompletion(request, response, next) {
  try {
    const skill = await setSkillCompletion(request.auth.userId, request.params.skillId, request.body?.completed)
    if (request.body?.completed) await evaluateRoadmapCompletion(request.auth.userId, skill.id)
    response.status(200).json({ success: true, skill })
  } catch (error) {
    next(error)
  }
}

export async function removeSkill(request, response, next) {
  try {
    await deleteSkill(request.auth.userId, request.params.skillId)
    response.status(200).json({ success: true, message: 'Skill deleted' })
  } catch (error) {
    next(error)
  }
}