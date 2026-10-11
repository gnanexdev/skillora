import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getLifeEventById, getLifeEvents, patchLifeEvent, postLifeEvent, removeLifeEvent } from '../controllers/lifeEventController.js'

const router = Router()

router.use(authenticate)
router.get('/', getLifeEvents)
router.post('/', postLifeEvent)
router.get('/:id', getLifeEventById)
router.patch('/:id', patchLifeEvent)
router.delete('/:id', removeLifeEvent)

export default router