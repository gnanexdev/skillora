import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getTasksForPlan, postTaskForPlan } from '../controllers/taskController.js'
import {
  getCurrentWeeklyPlan,
  getWeeklyPlanById,
  getWeeklyPlans,
  patchWeeklyPlan,
  postWeeklyPlan,
  removeWeeklyPlan,
} from '../controllers/weeklyPlanController.js'

const router = Router()

router.use(authenticate)
router.get('/', getWeeklyPlans)
router.get('/current', getCurrentWeeklyPlan)
router.get('/:weeklyPlanId/tasks', getTasksForPlan)
router.post('/:weeklyPlanId/tasks', postTaskForPlan)
router.get('/:id', getWeeklyPlanById)
router.post('/', postWeeklyPlan)
router.patch('/:id', patchWeeklyPlan)
router.delete('/:id', removeWeeklyPlan)

export default router