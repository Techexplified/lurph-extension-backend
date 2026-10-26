import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Session } from '../models/Session.js'

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m'
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30)
const JWT_ISSUER = 'lurph-api'
const JWT_AUDIENCE = 'lurph-extension'

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createAccessToken(userId, sessionId) {
  return jwt.sign(
    { sid: String(sessionId) },
    process.env.ACCESS_TOKEN_SECRET,
    {
      subject: String(userId),
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })
}

export function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export async function createSessionForUser(user) {
  const sessionId = new mongoose.Types.ObjectId()
  const refreshToken = `${sessionId.toString()}.${crypto.randomBytes(48).toString('base64url')}`
  const expiresAt = getRefreshTokenExpiry()

  await Session.create({
    _id: sessionId,
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
  })

  return {
    accessToken: createAccessToken(user._id, sessionId),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  }
}

export function parseRefreshToken(refreshToken) {
  if (typeof refreshToken !== 'string') return null
  const separator = refreshToken.indexOf('.')
  if (separator < 1) return null

  const sessionId = refreshToken.slice(0, separator)
  const secret = refreshToken.slice(separator + 1)

  if (!mongoose.Types.ObjectId.isValid(sessionId) || secret.length < 40) return null
  return { sessionId, secret }
}
