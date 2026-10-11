import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getProgressForGoal } from '../controllers/progressController.js'

const router = Router()

router.use(authenticate)
router.get('/:goalId/progress', getProgressForGoal)

export default router