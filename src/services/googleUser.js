import { User } from '../models/User.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getGoogleIdentity(profile) {
  const raw = profile?._json || {}
  const emailEntry = Array.isArray(profile?.emails)
    ? profile.emails.find((entry) => typeof entry?.value === 'string' && entry.value.trim())
    : null

  const email = String(emailEntry?.value || raw.email || '').trim().toLowerCase()
  const googleId = typeof profile?.id === 'string' ? profile.id.trim() : ''
  const name = String(
    profile?.displayName ||
      [profile?.name?.givenName, profile?.name?.familyName].filter(Boolean).join(' ') ||
      email.split('@')[0] ||
      '',
  ).trim().slice(0, 100)

  const verifiedValue = raw.email_verified ?? raw.verified_email ?? emailEntry?.verified
  const emailVerified = verifiedValue === true || verifiedValue === 'true'

  return { googleId, email, name, emailVerified }
}

/** Find an existing Google user, link a verified email, or create a new account. */
export async function findOrCreateGoogleUser(profile) {
  const { googleId, email, name, emailVerified } = getGoogleIdentity(profile)

  if (!googleId || !EMAIL_PATTERN.test(email) || email.length > 254 || !emailVerified) {
    const error = new Error('Google did not provide a verified email for this account.')
    error.code = 'GOOGLE_PROFILE_NOT_VERIFIED'
    throw error
  }

  let user = await User.findOne({ googleId })
  if (user) return user

  user = await User.findOne({ email })
  if (user) {
    if (user.googleId && user.googleId !== googleId) {
      const error = new Error('This email is linked to a different Google account.')
      error.code = 'GOOGLE_ACCOUNT_CONFLICT'
      throw error
    }

    user.googleId = googleId
    try {
      await user.save()
      return user
    } catch (error) {
      if (error?.code === 11000) {
        const linkedUser = await User.findOne({ googleId })
        if (linkedUser) return linkedUser
        const conflict = new Error('This Google account is already linked to another Lurph account.')
        conflict.code = 'GOOGLE_ACCOUNT_CONFLICT'
        throw conflict
      }
      throw error
    }
  }

  try {
    return await User.create({
      name: name || email.split('@')[0],
      email,
      googleId,
    })
  } catch (error) {
    if (error?.code !== 11000) throw error

    // A concurrent first-time login may have created/linked this account already.
    const byGoogleId = await User.findOne({ googleId })
    if (byGoogleId) return byGoogleId

    const byEmail = await User.findOne({ email })
    if (byEmail && (!byEmail.googleId || byEmail.googleId === googleId)) {
      byEmail.googleId = googleId
      await byEmail.save()
      return byEmail
    }

    const conflict = new Error('This Google account could not be linked to the Lurph account.')
    conflict.code = 'GOOGLE_ACCOUNT_CONFLICT'
    throw conflict
  }
}
