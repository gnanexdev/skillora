import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getTaskById,
  getTasks,
  patchTask,
  postTask,
  removeTask,
} from '../controllers/taskController.js'

const router = Router()

router.use(authenticate)
router.get('/', getTasks)
router.get('/:id', getTaskById)
router.post('/', postTask)
router.patch('/:id', patchTask)
router.delete('/:id', removeTask)

export default router