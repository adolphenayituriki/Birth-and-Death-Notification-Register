export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

const listeners = new Set()
let logCounter = 0

export function onApiLog(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStoredToken() {
  return localStorage.getItem('bndr_token')
}

export function setStoredToken(token) {
  localStorage.setItem('bndr_token', token)
}

export function clearStoredToken() {
  localStorage.removeItem('bndr_token')
  localStorage.removeItem('bndr_user')
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('bndr_user') || 'null')
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem('bndr_user', JSON.stringify(user))
}

function emitLog(entry) {
  for (const listener of listeners) listener(entry)
}

export async function api(path, options = {}) {
  const { method = 'GET', body, auth = true, label } = options
  const requestId = `web-${++logCounter}`
  const startedAt = performance.now()
  const headers = { Accept: 'application/json' }

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getStoredToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  let payload = null

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    payload = await response.json().catch(() => null)
  } catch {
    const failure = new ApiError('Cannot reach the server. Check that the API is running.', 0, 'NETWORK_ERROR')
    emitLog({
      id: requestId,
      time: new Date().toISOString(),
      method,
      path,
      status: 0,
      duration: Math.round(performance.now() - startedAt),
      ok: false,
      label,
      error: failure.message,
    })
    throw failure
  }

  const entry = {
    id: requestId,
    time: new Date().toISOString(),
    method,
    path,
    status: response.status,
    duration: Math.round(performance.now() - startedAt),
    ok: response.ok,
    label,
    code: payload?.error?.code,
  }
  emitLog(entry)

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || 'The request could not be completed',
      response.status,
      payload?.error?.code || 'REQUEST_FAILED',
      payload?.error?.details,
    )
  }

  return payload
}

export const apiEndpoints = {
  signup: (body) => api('/auth/signup', { method: 'POST', body, auth: false, label: 'signup' }),
  login: (body) => api('/auth/login', { method: 'POST', body, auth: false, label: 'login' }),
  me: () => api('/auth/me', { label: 'current_user' }),
  stats: () => api('/dashboard/stats', { label: 'dashboard_stats' }),
  notifications: (query = '') => api(`/notifications${query}`, { label: 'list_notifications' }),
  notification: (id) => api(`/notifications/${id}`, { label: 'read_notification' }),
  createNotification: (body) =>
    api('/notifications', { method: 'POST', body, label: 'create_notification' }),
  updateNotification: (id, body) =>
    api(`/notifications/${id}`, { method: 'PATCH', body, label: 'update_notification' }),
  deleteNotification: (id) =>
    api(`/notifications/${id}`, { method: 'DELETE', label: 'delete_notification' }),
  monthlyAnalytics: () =>
    api('/analytics/notifications-per-month', { label: 'notifications_per_month' }),
}
