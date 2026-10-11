import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getGoalById, getGoals, patchGoal, postGoal, removeGoal } from '../controllers/goalController.js'

const router = Router()

router.use(authenticate)
router.get('/', getGoals)
router.get('/:id', getGoalById)
router.post('/', postGoal)
router.patch('/:id', patchGoal)
router.delete('/:id', removeGoal)

export default router