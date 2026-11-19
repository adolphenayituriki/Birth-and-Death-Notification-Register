import mongoose from 'mongoose'
import { connectDb } from './db.js'
import { badRequest } from './errors.js'
import { Notification, User } from './models.js'
import { SEED_NOTIFICATIONS, SEED_USERS } from './seed.js'

let mode = 'memory'
const memory = { users: [], notifications: [] }

const SORT_FIELDS = ['type', 'person_name', 'event_date', 'status', 'createdAt', 'updatedAt']

export function isValidId(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
}

export function getStorageMode() {
  return mode
}

export function normalizeEventDate(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const parsed = new Date(`${text}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== text) return null
  return text
}

export function isFutureEventDate(value) {
  return value > new Date().toISOString().slice(0, 10)
}

function objectId(id) {
  return new mongoose.Types.ObjectId(id)
}

function iso(value) {
  return value ? new Date(value).toISOString() : null
}

function toDate(value) {
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value)
  return new Date(`${value}T00:00:00.000Z`)
}

function dateKey(value) {
  return toDate(value).toISOString().slice(0, 10)
}

function nameKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function serialize(doc) {
  if (!doc) return null

  const source =
    typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : { ...doc }
  const id = (source._id ?? source.id)?.toString?.() ?? source._id ?? source.id
  const result = { ...source, id, _id: id }

  delete result.__v
  delete result.password
  delete result.passwordHash
  result.createdAt = iso(result.createdAt)
  result.updatedAt = iso(result.updatedAt)
  result.event_date = iso(result.event_date)
  result.reporter_id = result.reporter_id?.toString?.() ?? result.reporter_id
  return result
}

function pagination(query, defaultSort) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 6))
  const [requestedField, requestedDirection] = String(query.sort || defaultSort).split(':')
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    field: requestedField,
    direction: requestedDirection === 'asc' ? 1 : -1,
  }
}

function meta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

function sortItems(items, field, direction) {
  return [...items].sort((a, b) => {
    const first = a[field] instanceof Date ? a[field].getTime() : String(a[field] ?? '')
    const second = b[field] instanceof Date ? b[field].getTime() : String(b[field] ?? '')
    if (first < second) return -1 * direction
    if (first > second) return 1 * direction
    return 0
  })
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function seedMemory() {
  memory.users = SEED_USERS.map((user) => ({ ...user }))
  memory.notifications = SEED_NOTIFICATIONS.map((item) => ({
    ...item,
    event_date: toDate(item.event_date),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }))
}

async function seedMongo() {
  if ((await User.countDocuments()) === 0) {
    await User.insertMany(SEED_USERS.map(({ password, ...user }) => user))
  }
  if ((await Notification.countDocuments()) === 0) {
    const healthWorker = await User.findOne({ role: 'health_worker' }).sort({ createdAt: 1 }).lean()
    const registrar = await User.findOne({ role: 'registrar' }).sort({ createdAt: 1 }).lean()
    const fallback = healthWorker ?? registrar ?? (await User.findOne().sort({ createdAt: 1 }).lean())
    const reporterFor = (seedId) =>
      seedId === '669000000000000000000002' ? registrar?._id ?? fallback?._id : fallback?._id

    await Notification.insertMany(
      SEED_NOTIFICATIONS.map((item) => ({
        ...item,
        reporter_id: reporterFor(item.reporter_id),
        event_date: toDate(item.event_date),
      })),
    )
  }
}

export async function initializeStore() {
  try {
    const connection = await connectDb()
    if (connection) {
      mode = 'mongodb'
      await seedMongo()
    } else {
      mode = 'memory'
      seedMemory()
    }
  } catch (error) {
    await mongoose.connection.close().catch(() => {})
    console.warn('  warning: MongoDB unavailable; using in-memory fallback.')
    console.warn(`  ${String(error.message).split('\n')[0]}`)
    mode = 'memory'
    seedMemory()
  }
  return mode
}

async function findDuplicate(values, excludeId) {
  const key = nameKey(values.person_name)
  const eventDate = dateKey(values.event_date)

  if (mode === 'mongodb') {
    const candidates = await Notification.find({ event_date: toDate(eventDate) }).lean()
    return candidates.find(
      (item) =>
        nameKey(item.person_name) === key && item._id.toString() !== String(excludeId ?? ''),
    )
  }

  return memory.notifications.find(
    (item) =>
      nameKey(item.person_name) === key &&
      dateKey(item.event_date) === eventDate &&
      item.id !== excludeId,
  )
}

async function assertUnique(values, excludeId) {
  const duplicate = await findDuplicate(values, excludeId)
  if (!duplicate) return

  throw badRequest(
    `A notification for ${values.person_name} on ${dateKey(values.event_date)} already exists. Check the name and date before submitting again.`,
    'DUPLICATE_NOTIFICATION',
  )
}

async function withReporter(doc) {
  const source = serialize(doc)
  if (!source) return null

  const reporter =
    mode === 'mongodb'
      ? await User.findById(source.reporter_id).lean()
      : memory.users.find((user) => user.id === source.reporter_id)

  source.reporter = reporter ? serialize(reporter) : null
  return source
}

async function rawNotification(id) {
  return mode === 'mongodb'
    ? Notification.findById(id).lean()
    : memory.notifications.find((item) => item.id === id)
}

export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null

  if (mode === 'mongodb') return User.findOne({ email: normalized }).lean()
  return memory.users.find((user) => user.email.toLowerCase() === normalized) || null
}

export async function findUserById(id) {
  if (mode === 'mongodb') return User.findById(id).lean()
  return memory.users.find((user) => user.id === id) || null
}

export async function linkUserGoogleId(id, googleId) {
  if (mode === 'mongodb') {
    return User.findByIdAndUpdate(id, { $set: { googleId } }, { new: true }).lean()
  }

  const user = memory.users.find((item) => item.id === id)
  if (!user) return null
  user.googleId = googleId
  user.updatedAt = new Date().toISOString()
  return user
}

export async function createUser(values) {
  if (mode === 'mongodb') {
    const user = await new User(values).save()
    return serialize(user)
  }

  const user = {
    ...values,
    id: new mongoose.Types.ObjectId().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  memory.users.push(user)
  return serialize(user)
}

export async function listNotifications(query) {
  const { page, limit, skip, field, direction } = pagination(query, 'createdAt:desc')
  const search = String(query.search || '').trim()

  if (mode === 'mongodb') {
    const filter = {}
    if (query.type) filter.type = query.type
    if (query.status) filter.status = query.status
    if (search) filter.person_name = { $regex: escapeRegex(search), $options: 'i' }

    const total = await Notification.countDocuments(filter)
    const docs = await Notification.find(filter)
      .sort({ [field]: direction })
      .skip(skip)
      .limit(limit)
      .lean()
    const data = await Promise.all(docs.map(withReporter))
    return { data, meta: meta(page, limit, total) }
  }

  let items = memory.notifications.filter((item) => {
    if (query.type && item.type !== query.type) return false
    if (query.status && item.status !== query.status) return false
    if (search && !nameKey(item.person_name).includes(nameKey(search))) return false
    return true
  })
  items = sortItems(items, field, direction)
  const data = await Promise.all(items.slice(skip, skip + limit).map(withReporter))
  return { data, meta: meta(page, limit, items.length) }
}

export async function getNotification(id) {
  const doc = await rawNotification(id)
  return withReporter(doc)
}

export async function createNotification(values) {
  await assertUnique(values)

  const record = {
    type: values.type,
    person_name: values.person_name,
    event_date: toDate(values.event_date),
    reporter_id: mode === 'mongodb' ? objectId(values.reporter_id) : values.reporter_id,
    status: values.status || 'pending',
  }

  if (mode === 'mongodb') {
    const doc = await new Notification(record).save()
    return withReporter(doc)
  }

  const doc = {
    ...record,
    id: new mongoose.Types.ObjectId().toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  memory.notifications.push(doc)
  return withReporter(doc)
}

export async function updateNotification(id, values) {
  const existing = await rawNotification(id)
  if (!existing) return null

  await assertUnique({ ...serialize(existing), ...values }, id)

  if (mode === 'mongodb') {
    const updated = await Notification.findByIdAndUpdate(id, values, {
      new: true,
      runValidators: true,
    }).lean()
    return withReporter(updated)
  }

  Object.assign(existing, values, { updatedAt: new Date() })
  return withReporter(existing)
}

export async function deleteNotification(id) {
  if (mode === 'mongodb') {
    const doc = await Notification.findByIdAndDelete(id).lean()
    return withReporter(doc)
  }

  const index = memory.notifications.findIndex((item) => item.id === id)
  if (index === -1) return null
  const [doc] = memory.notifications.splice(index, 1)
  return withReporter(doc)
}

export async function getDashboardStats() {
  const all =
    mode === 'mongodb'
      ? await Notification.find().lean()
      : memory.notifications.map((item) => serialize(item))

  const thisMonth = new Date().toISOString().slice(0, 7)
  return {
    total: all.length,
    pending: all.filter((item) => item.status === 'pending').length,
    underReview: all.filter((item) => item.status === 'under_review').length,
    registered: all.filter((item) => item.status === 'registered').length,
    rejected: all.filter((item) => item.status === 'rejected').length,
    births: all.filter((item) => item.type === 'birth').length,
    deaths: all.filter((item) => item.type === 'death').length,
    thisMonth: all.filter((item) => iso(item.event_date)?.slice(0, 7) === thisMonth).length,
  }
}

export async function getMonthlyAnalytics() {
  const all =
    mode === 'mongodb'
      ? await Notification.find().lean()
      : memory.notifications.map((item) => serialize(item))

  const groups = new Map()
  for (const item of all) {
    const key = iso(item.event_date)?.slice(0, 7)
    if (!key) continue
    if (!groups.has(key)) {
      groups.set(key, { month: key, label: '', births: 0, deaths: 0, total: 0 })
    }
    const group = groups.get(key)
    const type = String(item.type || '').toLowerCase()
    if (type === 'birth') group.births += 1
    if (type === 'death') group.deaths += 1
    group.total += 1
  }

  const months = [...groups.values()].sort((a, b) => a.month.localeCompare(b.month))
  for (const group of months) {
    group.label = new Date(`${group.month}-01T00:00:00.000Z`).toLocaleString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  return {
    months,
    total: all.length,
    births: all.filter((item) => String(item.type || '').toLowerCase() === 'birth').length,
    deaths: all.filter((item) => String(item.type || '').toLowerCase() === 'death').length,
  }
}
