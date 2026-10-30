import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../middleware/authenticate.js'
import { createChatCompletion } from '../controllers/chat.controller.js'

const router = Router()

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'You are sending messages too quickly. Please wait a moment.' },
})

router.post('/completions', authenticate, chatRateLimiter, createChatCompletion)

export default router
