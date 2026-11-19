import { randomBytes } from 'node:crypto'
import { compareSync, hashSync } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { badRequest, forbidden, unauthorized } from './errors.js'
import { createUser, findUserByEmail, linkUserGoogleId } from './store.js'

const { sign, verify } = jwt
const secret = process.env.JWT_SECRET?.trim() || 'dev-only-secret-change-me'
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function publicUser(user) {
  const { password, passwordHash, __v, ...safe } = user
  const id = (user.id ?? user._id)?.toString()
  return { ...safe, id, _id: id }
}

function validateCredentials(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw badRequest('Email and password are required')
  }
  const normalized = email.trim().toLowerCase()
  if (!emailPattern.test(normalized)) throw badRequest('Enter a valid email address')
  if (!password) throw badRequest('Password is required')
  return { email: normalized, password }
}

function tokenFor(user) {
  const id = (user.id ?? user._id)?.toString()
  return sign({ sub: id, role: user.role, name: user.name }, secret, { expiresIn: '7d' })
}

export async function signup(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const { email, password } = validateCredentials(body?.email, body?.password)
  const role = 'health_worker'
  const sector = typeof body?.sector === 'string' ? body.sector.trim() : ''

  if (name.length < 2 || name.length > 80) {
    throw badRequest('Name must be between 2 and 80 characters')
  }
  if (password.length < 6) throw badRequest('Password must be at least 6 characters')
  const existing = await findUserByEmail(email)
  if (existing) {
    const hint = existing.googleId
      ? 'Sign in or continue with Google.'
      : 'Sign in instead.'
    throw badRequest(`That email is already registered. ${hint}`, 'EMAIL_TAKEN')
  }

  const user = await createUser({
    name,
    email,
    role,
    sector,
    passwordHash: hashSync(password, 8),
  })
  return { token: tokenFor(user), user: publicUser(user) }
}

export async function login(email, password) {
  const credentials = validateCredentials(email, password)
  const user = await findUserByEmail(credentials.email)
  if (!user) {
    throw unauthorized(
      'No account is registered with that email. Create an account or continue with Google.',
      'EMAIL_NOT_REGISTERED',
    )
  }
  if (!compareSync(credentials.password, user.passwordHash)) {
    if (user.googleId) {
      throw unauthorized(
        'This email is linked to Google. Continue with Google, or check your password.',
        'GOOGLE_SIGNIN_REQUIRED',
      )
    }
    throw unauthorized('Incorrect email or password')
  }

  return { token: tokenFor(user), user: publicUser(user) }
}

async function googleProfile(accessToken) {
  if (!googleClientId) {
    throw badRequest('Google sign-in is not configured', 'GOOGLE_NOT_CONFIGURED')
  }
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw badRequest('Google access token is required')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  let response

  try {
    response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken.trim())}`,
      { signal: controller.signal },
    )
  } catch {
    throw unauthorized('Google could not be reached. Please try again.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) throw unauthorized('Your Google session expired. Please try again.')

  const profile = await response.json().catch(() => null)
  const email = String(profile?.email || '').trim().toLowerCase()
  const scopes = String(profile?.scope || '').split(' ')
  const isVerified = profile?.email_verified === true || profile?.email_verified === 'true'
  const isAllowedClient = profile?.aud === googleClientId || profile?.azp === googleClientId

  if (!profile?.sub || !isAllowedClient || !isVerified || !emailPattern.test(email) || !scopes.includes('email')) {
    throw unauthorized('Google account could not be verified for this app')
  }

  const rawName = String(profile.name || '').trim().replace(/\s+/g, ' ')
  const name =
    rawName.length >= 2 ? rawName.slice(0, 80) : email.split('@')[0].slice(0, 80)

  return { email, name, googleId: String(profile.sub) }
}

export async function googleSignIn(body) {
  const profile = await googleProfile(body?.accessToken)
  const existingUser = await findUserByEmail(profile.email)
  let user = existingUser
  let message = 'Signed in with Google.'

  if (user) {
    const userId = (user.id ?? user._id)?.toString()
    if (user.googleId && user.googleId !== profile.googleId) {
      throw unauthorized('This email is linked to a different Google account', 'GOOGLE_ACCOUNT_MISMATCH')
    }
    if (!user.googleId) {
      user = await linkUserGoogleId(userId, profile.googleId)
      if (!user) throw unauthorized('Your account could not be found. Please try again.')
      message = 'Google linked to your existing registered account.'
    } else {
      message = 'Signed in with your registered Google account.'
    }
  } else {
    user = await createUser({
      name: profile.name,
      email: profile.email,
      role: 'health_worker',
      sector: '',
      googleId: profile.googleId,
      passwordHash: hashSync(randomBytes(32).toString('hex'), 12),
    })
    message = 'Google email registered as a health worker.'
  }

  return {
    token: tokenFor(user),
    user: publicUser(user),
    isNewUser: !existingUser,
    existingEmail: Boolean(existingUser),
    message,
  }
}

export function authenticate(req, _res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return next(unauthorized())

  try {
    const payload = verify(token, secret)
    if (!payload.sub) throw new Error('Missing token subject')
    req.user = {
      id: String(payload.sub),
      role: payload.role,
      name: payload.name,
    }
    next()
  } catch {
    next(unauthorized('Your session has expired. Please log in again'))
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized())
    if (!roles.includes(req.user.role)) return next(forbidden())
    next()
  }
}
