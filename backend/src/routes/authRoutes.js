import { Router } from 'express'
import { getSettings, login, me, patchProfile, patchSettings, profile, register } from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, me)
router.get('/profile', authenticate, profile)
router.patch('/profile', authenticate, patchProfile)
router.get('/settings', authenticate, getSettings)
router.patch('/settings', authenticate, patchSettings)

export default router