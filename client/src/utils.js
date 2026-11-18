export const notificationTypeMeta = {
  birth: { label: 'Birth', tone: 'info', hint: 'New birth notification' },
  death: { label: 'Death', tone: 'danger', hint: 'New death notification' },
}

export const notificationStatusMeta = {
  pending: { label: 'Pending', tone: 'warning', hint: 'Waiting for registrar review' },
  under_review: { label: 'Under review', tone: 'info', hint: 'Registrar is checking the record' },
  registered: { label: 'Registered', tone: 'success', hint: 'Approved and recorded' },
  rejected: { label: 'Rejected', tone: 'danger', hint: 'Returned with a problem' },
}

export const roleMeta = {
  health_worker: { label: 'Health worker', short: 'Health worker' },
  registrar: { label: 'Registrar', short: 'Registrar' },
}

export function formatDate(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(value))
}

export function formatEventDate(value) {
  return formatDate(value)
}

export function formatRelative(value) {
  if (!value) return '—'
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function buildQuery(params) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function statusCodeText(status) {
  const labels = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Server Error',
  }
  return labels[status] || (status >= 200 && status < 300 ? 'Success' : 'Response')
}
