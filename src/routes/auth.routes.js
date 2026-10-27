import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import passport from '../config/passport.js'
import {
  currentUser,
  exchangeGoogleOAuthCode,
  finishGoogleOAuth,
  googleOAuthFailureRedirect,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js'
import { isGoogleOAuthConfigured } from '../config/passport.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
})

function ensureGoogleOAuthConfigured(_req, res, next) {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, and GOOGLE_EXTENSION_REDIRECT_URL.',
    })
  }
  return next()
}

router.post('/register', authRateLimiter, register)
router.post('/login', authRateLimiter, login)

// Start Google OAuth. Passport redirects to Google's consent/account chooser page.
router.get(
  '/google',
  authRateLimiter,
  ensureGoogleOAuthConfigured,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
)

// Google redirects to this backend callback. Passport verifies state and exchanges
// the Google authorization code before the one-time Lurph code is created.
router.get(
  '/google/callback',
  ensureGoogleOAuthConfigured,
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (error, user, info) => {
      if (error) {
        const failureCode = error?.code === 'GOOGLE_ACCOUNT_CONFLICT' ? 'account_conflict' : 'google_auth_failed'
        return googleOAuthFailureRedirect(res, failureCode)
      }
      if (!user) {
        return googleOAuthFailureRedirect(res, req.query?.error === 'access_denied' ? 'access_denied' : 'google_auth_failed')
      }
      req.googleOAuthUser = user
      return next()
    })(req, res, next)
  },
  finishGoogleOAuth,
)

// Exchange the one-time callback code for the usual Lurph access/refresh tokens.
router.post('/google/exchange', authRateLimiter, ensureGoogleOAuthConfigured, exchangeGoogleOAuthCode)

router.post('/refresh', authRateLimiter, refresh)
router.get('/me', authenticate, currentUser)
router.post('/logout', authenticate, logout)

export default router
