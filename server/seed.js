import { hashSync } from 'bcryptjs'

const now = Date.now()
const day = 24 * 60 * 60 * 1000
const ago = (days) => new Date(now - days * day)
const eventDate = (days) => ago(days).toISOString().slice(0, 10)

export const SEED_USERS = [
  {
    id: '669000000000000000000001',
    name: 'Test Health Worker',
    email: 'health@register.test',
    role: 'health_worker',
    password: 'Health123!',
    passwordHash: hashSync('Health123!', 8),
    sector: 'Test clinic',
  },
  {
    id: '669000000000000000000002',
    name: 'Test Registrar',
    email: 'registrar@register.test',
    role: 'registrar',
    password: 'Registrar123!',
    passwordHash: hashSync('Registrar123!', 8),
    sector: 'Civil registry',
  },
]

export const SEED_NOTIFICATIONS = [
  {
    id: '668000000000000000000001',
    type: 'birth',
    person_name: 'Amara Wanjiku',
    event_date: eventDate(2),
    reporter_id: '669000000000000000000001',
    status: 'pending',
  },
  {
    id: '668000000000000000000002',
    type: 'death',
    person_name: 'Joseph Mwangi',
    event_date: eventDate(4),
    reporter_id: '669000000000000000000001',
    status: 'under_review',
  },
  {
    id: '668000000000000000000003',
    type: 'birth',
    person_name: 'Faith Cherono',
    event_date: eventDate(7),
    reporter_id: '669000000000000000000002',
    status: 'registered',
  },
  {
    id: '668000000000000000000004',
    type: 'death',
    person_name: 'Samuel Okoro',
    event_date: eventDate(12),
    reporter_id: '669000000000000000000001',
    status: 'registered',
  },
  {
    id: '668000000000000000000005',
    type: 'birth',
    person_name: 'Mercy Njeri',
    event_date: eventDate(18),
    reporter_id: '669000000000000000000002',
    status: 'rejected',
  },
  {
    id: '668000000000000000000006',
    type: 'death',
    person_name: 'Elizabeth Achieng',
    event_date: eventDate(25),
    reporter_id: '669000000000000000000001',
    status: 'pending',
  },
  {
    id: '668000000000000000000007',
    type: 'birth',
    person_name: 'David Kimani',
    event_date: eventDate(33),
    reporter_id: '669000000000000000000002',
    status: 'registered',
  },
  {
    id: '668000000000000000000008',
    type: 'death',
    person_name: 'Paul Mutua',
    event_date: eventDate(47),
    reporter_id: '669000000000000000000001',
    status: 'under_review',
  },
  {
    id: '668000000000000000000009',
    type: 'birth',
    person_name: 'Grace Wambui',
    event_date: eventDate(62),
    reporter_id: '669000000000000000000002',
    status: 'registered',
  },
  {
    id: '668000000000000000000010',
    type: 'death',
    person_name: 'Noah Kiptoo',
    event_date: eventDate(85),
    reporter_id: '669000000000000000000001',
    status: 'registered',
  },
].map((notification, index) => {
  const createdAt = ago(index + 1)
  return { ...notification, createdAt, updatedAt: createdAt }
})
