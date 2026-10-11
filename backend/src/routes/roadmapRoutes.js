import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getRoadmapForGoal,
  patchMilestone,
  patchRoadmap,
  patchSkill,
  patchSkillCompletion,
  postMilestone,
  postRoadmap,
  postSkill,
  removeMilestone,
  removeRoadmap,
  removeSkill,
} from '../controllers/roadmapController.js'

const router = Router()

router.use(authenticate)
router.get('/goals/:goalId/roadmap', getRoadmapForGoal)
router.post('/goals/:goalId/roadmap', postRoadmap)
router.patch('/roadmaps/:roadmapId', patchRoadmap)
router.delete('/roadmaps/:roadmapId', removeRoadmap)
router.post('/roadmaps/:roadmapId/milestones', postMilestone)
router.patch('/milestones/:milestoneId', patchMilestone)
router.delete('/milestones/:milestoneId', removeMilestone)
router.post('/milestones/:milestoneId/skills', postSkill)
router.patch('/skills/:skillId', patchSkill)
router.patch('/skills/:skillId/completion', patchSkillCompletion)
router.delete('/skills/:skillId', removeSkill)

export default router