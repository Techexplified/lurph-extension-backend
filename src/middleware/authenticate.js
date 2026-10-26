import mongoose from 'mongoose'
import { Session } from '../models/Session.js'
import { verifyAccessToken } from '../utils/authTokens.js'

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || ''
  const [scheme, token, ...extra] = authorization.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra.length > 0) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  try {
    const payload = verifyAccessToken(token)
    if (
      typeof payload === 'string' ||
      !payload.sub ||
      !payload.sid ||
      !mongoose.Types.ObjectId.isValid(payload.sub) ||
      !mongoose.Types.ObjectId.isValid(payload.sid)
    ) {
      return res.status(401).json({ message: 'Invalid or expired access token.' })
    }

    const session = await Session.findOne({
      _id: payload.sid,
      user: payload.sub,
      expiresAt: { $gt: new Date() },
    }).select('_id user')

    if (!session) {
      return res.status(401).json({ message: 'Session has expired or been revoked.' })
    }

    req.auth = {
      userId: String(payload.sub),
      sessionId: String(payload.sid),
    }
    return next()
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Invalid or expired access token.' })
    }
    return next(error)
  }
}
