import { spawn } from 'node:child_process'

const port = 4100
const base = `http://127.0.0.1:${port}/api`
const server = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(port), MONGODB_URI: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk })
server.stderr.on('data', (chunk) => { serverOutput += chunk })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`)
      if (response.ok) return
    } catch {
      await sleep(250)
    }
  }
  throw new Error(`Server did not start:\n${serverOutput}`)
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  await waitForServer()

  const healthWorker = await request('/auth/login', {
    method: 'POST',
    body: { email: 'health@register.test', password: 'Health123!' },
  })
  assert(healthWorker.status === 200, `health worker login expected 200, got ${healthWorker.status}`)
  const healthToken = healthWorker.body.token

  const me = await request('/auth/me', { token: healthToken })
  assert(me.status === 200, `current user expected 200, got ${me.status}`)
  assert(me.body.user.id, 'current user should include an id')
  assert(me.body.user.email === 'health@register.test', 'current user should include the email')

  const registrar = await request('/auth/login', {
    method: 'POST',
    body: { email: 'registrar@register.test', password: 'Registrar123!' },
  })
  assert(registrar.status === 200, `registrar login expected 200, got ${registrar.status}`)
  const registrarToken = registrar.body.token

  const list = await request('/notifications?page=1&limit=10&sort=createdAt:desc', {
    token: healthToken,
  })
  assert(list.status === 200, `notifications expected 200, got ${list.status}`)
  assert(list.body.data.length === 10, 'expected 10 seeded notifications')
  assert(list.body.meta.total === 10, 'expected pagination meta total of 10')

  const personName = `Smoke Test ${Date.now()}`
  const eventDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const created = await request('/notifications', {
    method: 'POST',
    token: healthToken,
    body: { type: 'birth', person_name: personName, event_date: eventDate },
  })
  assert(created.status === 201, `create expected 201, got ${created.status}`)
  assert(created.body.status === 'pending', 'new notification should start as pending')
  const id = created.body.id

  const detail = await request(`/notifications/${id}`, { token: healthToken })
  assert(detail.status === 200, `notification detail expected 200, got ${detail.status}`)
  assert(
    detail.body.reporter?.email === 'health@register.test',
    'notification detail should link the submitting health worker',
  )

  const duplicate = await request('/notifications', {
    method: 'POST',
    token: healthToken,
    body: { type: 'birth', person_name: personName, event_date: eventDate },
  })
  assert(duplicate.status === 400, `duplicate expected 400, got ${duplicate.status}`)
  assert(
    duplicate.body.error.code === 'DUPLICATE_NOTIFICATION',
    'expected DUPLICATE_NOTIFICATION code',
  )

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const futureDate = await request('/notifications', {
    method: 'POST',
    token: healthToken,
    body: { type: 'death', person_name: `Future ${Date.now()}`, event_date: future },
  })
  assert(futureDate.status === 400, `future date expected 400, got ${futureDate.status}`)
  assert(futureDate.body.error.code === 'FUTURE_EVENT_DATE', 'expected FUTURE_EVENT_DATE code')

  const badInput = await request('/notifications', {
    method: 'POST',
    token: healthToken,
    body: { type: 'other', person_name: 'X', event_date: eventDate },
  })
  assert(badInput.status === 400, `bad input expected 400, got ${badInput.status}`)
  assert(badInput.body.error.code === 'VALIDATION_ERROR', 'expected VALIDATION_ERROR code')

  const forbidden = await request(`/notifications/${id}`, {
    method: 'PATCH',
    token: healthToken,
    body: { status: 'registered' },
  })
  assert(forbidden.status === 403, `health worker patch expected 403, got ${forbidden.status}`)
  assert(forbidden.body.error.code === 'FORBIDDEN', 'expected FORBIDDEN code')

  const forbiddenDelete = await request(`/notifications/${id}`, {
    method: 'DELETE',
    token: healthToken,
  })
  assert(forbiddenDelete.status === 403, `health worker delete expected 403, got ${forbiddenDelete.status}`)

  const forbiddenAnalytics = await request('/analytics/notifications-per-month', {
    token: healthToken,
  })
  assert(
    forbiddenAnalytics.status === 403,
    `health worker analytics expected 403, got ${forbiddenAnalytics.status}`,
  )

  const missing = await request('/notifications/000000000000000000000000', {
    token: registrarToken,
  })
  assert(missing.status === 404, `missing record expected 404, got ${missing.status}`)
  assert(
    missing.body.error.code === 'NOTIFICATION_NOT_FOUND',
    'expected NOTIFICATION_NOT_FOUND code',
  )

  const updated = await request(`/notifications/${id}`, {
    method: 'PATCH',
    token: registrarToken,
    body: { status: 'registered' },
  })
  assert(updated.status === 200, `registrar patch expected 200, got ${updated.status}`)
  assert(updated.body.status === 'registered', 'status should be registered after patch')

  const analytics = await request('/analytics/notifications-per-month', { token: registrarToken })
  assert(analytics.status === 200, `analytics expected 200, got ${analytics.status}`)
  assert(analytics.body.months.length > 0, 'expected monthly analytics groups')
  assert(analytics.body.total >= 11, 'analytics should include seeded and created notifications')
  assert(analytics.body.births > 0, 'analytics should count births')
  assert(analytics.body.deaths > 0, 'analytics should count deaths')
  assert(
    analytics.body.months.some((month) => month.births > 0 && month.deaths > 0),
    'monthly analytics should split births and deaths',
  )

  const signup = await request('/auth/signup', {
    method: 'POST',
    body: {
      name: 'Smoke Tester',
      email: `smoke-${Date.now()}@register.test`,
      password: 'password123',
      role: 'registrar',
    },
  })
  assert(signup.status === 201, `signup expected 201, got ${signup.status}`)
  assert(
    signup.body.user.role === 'health_worker',
    'signup must ignore the requested role and create a health worker',
  )

  const duplicateSignup = await request('/auth/signup', {
    method: 'POST',
    body: {
      name: 'Duplicate Tester',
      email: signup.body.user.email,
      password: 'password123',
    },
  })
  assert(duplicateSignup.status === 400, `duplicate signup expected 400, got ${duplicateSignup.status}`)
  assert(
    duplicateSignup.body.error.code === 'EMAIL_TAKEN',
    'duplicate signup must return EMAIL_TAKEN',
  )

  const unregisteredLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: `missing-${Date.now()}@register.test`,
      password: 'password123',
    },
  })
  assert(unregisteredLogin.status === 401, `unregistered login expected 401, got ${unregisteredLogin.status}`)
  assert(
    unregisteredLogin.body.error.code === 'EMAIL_NOT_REGISTERED',
    'unregistered login must return EMAIL_NOT_REGISTERED',
  )

  console.log('API smoke tests passed: 200, 201, 400, 401, 403 and 404 flows verified.')
} catch (error) {
  console.error(error)
  console.error(serverOutput)
  process.exitCode = 1
} finally {
  server.kill()
}
