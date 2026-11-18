import { compareSync, hashSync } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { badRequest, forbidden, unauthorized } from './errors.js'
import { createUser, findUserByEmail } from './store.js'

const { sign, verify } = jwt
const secret = process.env.JWT_SECRET?.trim() || 'dev-only-secret-change-me'
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
  if (await findUserByEmail(email)) {
    throw badRequest('An account with that email already exists', 'EMAIL_TAKEN')
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
  if (!user || !compareSync(credentials.password, user.passwordHash)) {
    throw unauthorized('Incorrect email or password')
  }

  return { token: tokenFor(user), user: publicUser(user) }
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
