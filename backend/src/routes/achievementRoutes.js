import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getAchievementById, getAchievements } from '../controllers/achievementController.js'

const router = Router()

router.use(authenticate)
router.get('/', getAchievements)
router.get('/:id', getAchievementById)

export default router