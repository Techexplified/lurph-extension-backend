import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Session } from '../models/Session.js'
import {
  createAccessToken,
  createSessionForUser,
  getRefreshTokenExpiry,
  hashToken,
  parseRefreshToken,
} from '../utils/authTokens.js'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    productUpdates: Boolean(user.productUpdates),
    createdAt: user.createdAt,
  }
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_PATTERN.test(email.trim())
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH
}

function sendAuthResponse(res, user, tokens, status = 200) {
  return res.status(status).json({
    message: status === 201 ? 'Account created successfully.' : 'Authentication successful.',
    user: publicUser(user),
    tokens,
  })
}

export async function register(req, res) {
  const body = req.body || {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const { password, acceptedTerms, productUpdates = false } = body

  if (!name || name.length > 100) {
    return res.status(400).json({ message: 'Name is required and must be at most 100 characters.' })
  }
  if (!validEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' })
  }
  if (!validPassword(password)) {
    return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' })
  }
  if (acceptedTerms !== true) {
    return res.status(400).json({ message: 'You must accept the Terms of Service and Privacy Policy.' })
  }
  if (typeof productUpdates !== 'boolean') {
    return res.status(400).json({ message: 'productUpdates must be a boolean.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
      acceptedTermsAt: new Date(),
      productUpdates,
    })
    const tokens = await createSessionForUser(user)
    return sendAuthResponse(res, user, tokens, 201)
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    throw error
  }
}

export async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = req.body?.password

  if (!validEmail(email) || typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ message: 'Enter a valid email address and password.' })
  }

  const user = await User.findOne({ email }).select('+passwordHash')
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false

  if (!user || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const tokens = await createSessionForUser(user)
  return sendAuthResponse(res, user, tokens)
}

export async function refresh(req, res) {
  const tokenParts = parseRefreshToken(req.body?.refreshToken)
  if (!tokenParts) {
    return res.status(400).json({ message: 'A valid refresh token is required.' })
  }

  const { sessionId } = tokenParts
  const refreshToken = req.body.refreshToken
  const now = new Date()
  const session = await Session.findOne({ _id: sessionId, expiresAt: { $gt: now } })
    .select('+refreshTokenHash')
    .populate('user')

  if (!session || !session.user || session.refreshTokenHash !== hashToken(refreshToken)) {
    return res.status(401).json({ message: 'Refresh token is invalid or expired. Please sign in again.' })
  }

  const nextRefreshToken = `${session._id.toString()}.${randomBytes(48).toString('base64url')}`
  const nextExpiresAt = getRefreshTokenExpiry()
  const rotatedSession = await Session.findOneAndUpdate(
    {
      _id: session._id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: { $gt: now },
    },
    {
      $set: {
        refreshTokenHash: hashToken(nextRefreshToken),
        expiresAt: nextExpiresAt,
      },
    },
    { new: true },
  )

  // Atomic compare-and-update prevents the same refresh token from being used twice.
  if (!rotatedSession) {
    return res.status(401).json({ message: 'Refresh token has already been used. Please sign in again.' })
  }

  return res.status(200).json({
    message: 'Session refreshed successfully.',
    user: publicUser(session.user),
    tokens: {
      accessToken: createAccessToken(session.user._id, session._id),
      accessTokenExpiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: nextExpiresAt,
    },
  })
}

export async function currentUser(req, res) {
  const user = await User.findById(req.auth.userId)
  if (!user) {
    return res.status(401).json({ message: 'User account no longer exists.' })
  }
  return res.status(200).json({ user: publicUser(user) })
}

export async function logout(req, res) {
  await Session.deleteOne({
    _id: new mongoose.Types.ObjectId(req.auth.sessionId),
    user: new mongoose.Types.ObjectId(req.auth.userId),
  })
  return res.status(200).json({ message: 'Signed out successfully.' })
}
