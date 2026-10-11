import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getPlanningRecommendations, patchPlanningRecommendation } from '../controllers/planningRecommendationController.js'

const router = Router()

router.use(authenticate)
router.get('/', getPlanningRecommendations)
router.patch('/:id', patchPlanningRecommendation)

export default router