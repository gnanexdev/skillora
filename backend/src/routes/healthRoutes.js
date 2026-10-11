import { Router } from 'express'
import { getDatabaseHealth, getHealth } from '../controllers/healthController.js'

const router = Router()

router.get('/', getHealth)
router.get('/database', getDatabaseHealth)

export default router
