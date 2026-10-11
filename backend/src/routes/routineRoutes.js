import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getRoutineById, getRoutines, patchRoutine, patchRoutineOccurrence, postRoutine, removeRoutine } from '../controllers/routineController.js'

const router = Router()

router.use(authenticate)
router.get('/', getRoutines)
router.post('/', postRoutine)
router.get('/:id', getRoutineById)
router.patch('/:id/occurrences/:date', patchRoutineOccurrence)
router.patch('/:id', patchRoutine)
router.delete('/:id', removeRoutine)

export default router