import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getReview, putReview } from '../controllers/weeklyReviewController.js'

const router = Router()

router.use(authenticate)
router.get('/', getReview)
router.put('/', putReview)

export default router