import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { currentUser, login, logout, refresh, register } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
})

router.post('/register', authRateLimiter, register)
router.post('/login', authRateLimiter, login)
router.post('/refresh', authRateLimiter, refresh)
router.get('/me', authenticate, currentUser)
router.post('/logout', authenticate, logout)

export default router
