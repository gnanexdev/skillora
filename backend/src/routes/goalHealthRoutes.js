import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getGoalHealthById } from '../controllers/goalHealthController.js'

const router = Router()

router.use(authenticate)
router.get('/:goalId/health', getGoalHealthById)

export default router
