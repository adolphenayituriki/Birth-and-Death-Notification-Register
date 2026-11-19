import cors from 'cors'
import express from 'express'
import { authenticate, authorize, googleSignIn, login, publicUser, signup } from './auth.js'
import { AppError, badRequest, notFound, unauthorized } from './errors.js'
import { openApiSpec, swaggerHtml } from './openapi.js'
import {
  createNotification,
  deleteNotification,
  getDashboardStats,
  getMonthlyAnalytics,
  getNotification,
  getStorageMode,
  findUserById,
  isFutureEventDate,
  isValidId,
  listNotifications,
  normalizeEventDate,
  updateNotification,
} from './store.js'

const app = express()
let requestNumber = 0

app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '20kb' }))

app.use((req, res, next) => {
  const requestId = `req-${++requestNumber}`
  const startedAt = Date.now()
  req.requestId = requestId
  req.logContext = {}

  res.on('finish', () => {
    const action = req.logContext.action || `${req.method.toLowerCase()}_request`
    const role = req.user?.role || 'public'
    const context = Object.entries(req.logContext)
      .filter(([key]) => key !== 'action')
      .map(([key, value]) => `${key}=${value}`)
      .join(' ')
    const suffix = context ? ` ${context}` : ''
    console.log(
      `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms) action=${action} role=${role}${suffix}`,
    )
  })
  next()
})

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

function cleanString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') throw badRequest(`${field} must be text`)
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (trimmed.length < min) throw badRequest(`${field} must be at least ${min} characters`)
  if (trimmed.length > max) throw badRequest(`${field} cannot exceed ${max} characters`)
  return trimmed
}

function validatePagination(query) {
  for (const key of ['page', 'limit']) {
    if (query[key] === undefined) continue
    const value = Number(query[key])
    if (!Number.isInteger(value) || value < 1) {
      throw badRequest(`${key} must be a positive integer`)
    }
  }
}

function validateSort(query, allowedFields) {
  if (!query.sort) return
  const [field, direction] = String(query.sort).split(':')
  if (!allowedFields.includes(field) || (direction && !['asc', 'desc'].includes(direction))) {
    throw badRequest(`sort must be one of ${allowedFields.join(', ')} with asc or desc`)
  }
}

function validateNotificationBody(body, partial = false) {
  const values = {}

  if (!partial || body.type !== undefined) {
    if (!['birth', 'death'].includes(body.type)) {
      throw badRequest('type must be birth or death')
    }
    values.type = body.type
  }

  if (!partial || body.person_name !== undefined) {
    values.person_name = cleanString(body.person_name, 'Person name', { min: 2, max: 100 })
  }

  if (!partial || body.event_date !== undefined) {
    const eventDate = normalizeEventDate(body.event_date)
    if (!eventDate) throw badRequest('event_date must be a valid date in YYYY-MM-DD format')
    if (isFutureEventDate(eventDate)) {
      throw badRequest('Event date cannot be in the future', 'FUTURE_EVENT_DATE')
    }
    values.event_date = eventDate
  }

  if (!partial) {
    values.status = 'pending'
  } else if (body.status !== undefined) {
    if (!['pending', 'under_review', 'registered', 'rejected'].includes(body.status)) {
      throw badRequest('status must be pending, under_review, registered or rejected')
    }
    values.status = body.status
  }

  if (partial && Object.keys(values).length === 0) {
    throw badRequest('Provide at least one field to update')
  }
  return values
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: getStorageMode(),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

app.get(['/api/openapi.json', '/api/OpenAPI_JSON'], (_req, res) => {
  res.json(openApiSpec)
})

app.get(['/api/docs', '/api/Swagger_UI'], (_req, res) => {
  res.type('html').send(swaggerHtml)
})

app.post(
  '/api/auth/signup',
  asyncRoute(async (req, res) => {
    const result = await signup(req.body || {})
    req.logContext = { action: 'signup', role: result.user.role, user: result.user.id }
    res.status(201).json(result)
  }),
)

app.post(
  '/api/auth/login',
  asyncRoute(async (req, res) => {
    const result = await login(req.body?.email, req.body?.password)
    req.logContext = { action: 'login', role: result.user.role, user: result.user.id }
    res.json(result)
  }),
)

app.post(
  '/api/auth/google',
  asyncRoute(async (req, res) => {
    const result = await googleSignIn(req.body || {})
    req.logContext = { action: 'google_signin', role: result.user.role, user: result.user.id }
    res.json(result)
  }),
)

app.get(
  '/api/auth/me',
  authenticate,
  asyncRoute(async (req, res) => {
    const user = await findUserById(req.user.id)
    if (!user) throw unauthorized('Your session is no longer valid. Please log in again')
    req.logContext = { action: 'current_user' }
    res.json({ user: publicUser(user) })
  }),
)

app.get(
  '/api/dashboard/stats',
  authenticate,
  asyncRoute(async (req, res) => {
    req.logContext = { action: 'dashboard_stats' }
    res.json(await getDashboardStats())
  }),
)

app.get(
  '/api/notifications',
  authenticate,
  asyncRoute(async (req, res) => {
    validatePagination(req.query)
    validateSort(req.query, ['type', 'person_name', 'event_date', 'status', 'createdAt', 'updatedAt'])
    if (req.query.type && !['birth', 'death'].includes(req.query.type)) {
      throw badRequest('type filter must be birth or death')
    }
    if (
      req.query.status &&
      !['pending', 'under_review', 'registered', 'rejected'].includes(req.query.status)
    ) {
      throw badRequest('status filter must be pending, under_review, registered or rejected')
    }
    req.logContext = { action: 'list_notifications' }
    res.json(await listNotifications(req.query))
  }),
)

app.get(
  '/api/notifications/:id',
  authenticate,
  asyncRoute(async (req, res) => {
    if (!isValidId(req.params.id)) throw badRequest('Invalid notification id')
    const notification = await getNotification(req.params.id)
    if (!notification) throw notFound('Notification not found', 'NOTIFICATION_NOT_FOUND')
    req.logContext = { action: 'read_notification', notification: req.params.id }
    res.json(notification)
  }),
)

app.post(
  '/api/notifications',
  authenticate,
  authorize('health_worker', 'registrar'),
  asyncRoute(async (req, res) => {
    const values = validateNotificationBody(req.body || {})
    const notification = await createNotification({ ...values, reporter_id: req.user.id })
    req.logContext = {
      action: 'create_notification',
      notification: notification.id,
      type: notification.type,
    }
    res.status(201).json(notification)
  }),
)

app.patch(
  '/api/notifications/:id',
  authenticate,
  authorize('registrar'),
  asyncRoute(async (req, res) => {
    if (!isValidId(req.params.id)) throw badRequest('Invalid notification id')
    const values = validateNotificationBody(req.body || {}, true)
    const notification = await updateNotification(req.params.id, values)
    if (!notification) throw notFound('Notification not found', 'NOTIFICATION_NOT_FOUND')
    req.logContext = {
      action: 'update_notification',
      notification: notification.id,
      status: notification.status,
    }
    res.json(notification)
  }),
)

app.delete(
  '/api/notifications/:id',
  authenticate,
  authorize('registrar'),
  asyncRoute(async (req, res) => {
    if (!isValidId(req.params.id)) throw badRequest('Invalid notification id')
    const notification = await deleteNotification(req.params.id)
    if (!notification) throw notFound('Notification not found', 'NOTIFICATION_NOT_FOUND')
    req.logContext = { action: 'delete_notification', notification: notification.id }
    res.json({ deleted: true, notification })
  }),
)

app.get(
  '/api/analytics/notifications-per-month',
  authenticate,
  authorize('registrar'),
  asyncRoute(async (req, res) => {
    req.logContext = { action: 'notifications_per_month' }
    res.json(await getMonthlyAnalytics())
  }),
)

app.use((req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No endpoint at ${req.method} ${req.path}`))
})

app.use((error, req, res, _next) => {
  let status = error.status || 500
  let code = error.code || 'INTERNAL_ERROR'
  let message = error.message || 'Something went wrong'
  let details

  if (error.name === 'ValidationError') {
    status = 400
    code = 'VALIDATION_ERROR'
    details = Object.fromEntries(
      Object.entries(error.errors).map(([field, value]) => [field, value.message]),
    )
    message = 'Please check the highlighted fields'
  } else if (error.name === 'CastError') {
    status = 400
    code = 'VALIDATION_ERROR'
    message = 'One of the ids or values is not valid'
  } else if (error.code === 11000) {
    status = 400
    code = 'DUPLICATE_NOTIFICATION'
    message = 'A notification with this person name and event date already exists.'
  }

  if (status >= 500) console.error(`[${req.requestId}]`, error)

  res.status(status).json({
    error: { message, code, requestId: req.requestId, ...(details ? { details } : {}) },
  })
})

export default app
