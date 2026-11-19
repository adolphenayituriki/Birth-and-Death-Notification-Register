# Birth and Death Notification Register

A full-stack classroom project for recording birth and death notifications. Health workers submit guided notifications; registrars review them, set the final status, and track monthly totals. The register prevents duplicate records using `person_name` + `event_date` and rejects future event dates.

The UI is a responsive React dashboard styled with Tailwind CSS in a white and water-blue theme. It includes role-aware navigation, sortable/filterable lists, pagination, loading/empty/error states, and classroom activities.

## Tech stack

- **Client:** React 19 + Vite + Tailwind CSS 4
- **Server:** Node.js + Express
- **Database:** MongoDB with Mongoose schemas
- **Authentication:** JWT plus bcrypt password hashing, with optional Google OAuth sign-in
- **Fallback:** If `MONGODB_URI` is blank or MongoDB is unreachable, the API runs in an in-memory fallback mode with the same 10 seeded notifications, so the project is always runnable.

## What the system does

1. Health workers sign in and create a notification in three steps.
2. The server validates `type`, `person_name` and `event_date` (`400` for bad input).
3. An event date in the future is rejected with `FUTURE_EVENT_DATE`.
4. A repeated `person_name` + `event_date` is rejected with `DUPLICATE_NOTIFICATION`.
5. Registrars see the review queue and can move records to `under_review`, `registered` or `rejected`.
6. Registrars can delete accidental records and view notifications per month.
7. Lists support `page`, `limit`, `sort`, `search`, `type` and `status`.

## User roles

| Role | Menu / abilities |
| --- | --- |
| `health_worker` | Overview, Notifications, New notification, Classroom activities |
| `registrar` | Overview, Notifications, New notification, Review queue, Monthly analytics, Classroom activities |

Test accounts (seeded on the server):

| Role | Email | Password |
| --- | --- | --- |
| Health worker | `health@register.test` | `Health123!` |
| Registrar | `registrar@register.test` | `Registrar123!` |

You can also create a health worker account from the sign-up panel. Registrar accounts are provisioned separately through the seed data or an administrator.

## Quick start

```bash
npm install
npm run dev:all
```

- Client: <http://localhost:5173>
- API: <http://localhost:4000/api>
- Health check: <http://localhost:4000/api/health>

Run only one side if preferred, from the project root:

```bash
npm run server   # Express API on port 4000
npm run dev      # Vite client on port 5173
```

Or start each folder directly after installing dependencies once at the root:

```bash
cd server && npm start   # Express API on port 4000
cd client && npm start   # Vite client on port 5173
```

### Using real MongoDB

A `.env` file already exists in the project root. Paste your connection string into `MONGODB_URI`:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/birth-death-register
JWT_SECRET=replace-this-with-a-long-random-secret
PORT=4000
```

The server prints `storage: mongodb` or `storage: memory fallback` on startup. With MongoDB, collections are created from strict Mongoose schemas and seeded automatically when empty. If the database cannot be reached, the same seed data is kept in process memory and resets when the server restarts.

### Google sign-in

The auth dialog includes **Continue with Google**. To activate it, create an OAuth client ID of type *Web application* in Google Cloud, add `http://localhost:5173` and your deployed HTTPS origin as authorized JavaScript origins, and add the same client ID to both variables:

```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Restart both servers after changing these values. The server verifies Google access tokens and creates first-time Google users as health workers; existing verified emails sign in to their current account.

## Database design

MongoDB uses `_id` as the primary key. `notifications.reporter_id` references `users._id` through a Mongoose `ref`. Required fields use `required: true` (the Mongo equivalent of `NOT NULL`), with enums, trimmed strings and a compound unique index for duplicates.

### `users`

| Field | Type | Rules |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `name` | String | Required, trimmed, max 80 |
| `email` | String | Required, unique, lowercase |
| `passwordHash` | String | Required, bcrypt hash; never returned by the API |
| `googleId` | String | Optional Google account identifier for OAuth users |
| `role` | String | Required, one of `health_worker`, `registrar` |
| `sector` | String | Trimmed, max 80 |
| `createdAt` / `updatedAt` | Date | Automatic timestamps |

### `notifications`

| Field | Type | Rules |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `type` | String | Required, one of `birth`, `death` |
| `person_name` | String | Required, trimmed, 2–100 characters |
| `event_date` | Date | Required, cannot be in the future |
| `reporter_id` | ObjectId | Required foreign key to `users._id` |
| `status` | String | Required, one of `pending`, `under_review`, `registered`, `rejected` |
| `createdAt` / `updatedAt` | Date | Automatic timestamps |

A unique index on `{ person_name: 1, event_date: 1 }` plus an API pre-check blocks duplicate notifications. Ten sample notifications and two users are seeded.

## API

All responses are JSON. Every endpoint except `/api/health`, `/api/docs`, `/api/Swagger_UI`, `/api/openapi.json`, `/api/OpenAPI_JSON`, and auth requires `Authorization: Bearer <token>`.

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Health and storage mode |
| POST | `/api/auth/signup` | public | Create health worker account |
| POST | `/api/auth/login` | public | Get JWT token |
| POST | `/api/auth/google` | public | Exchange a verified Google access token for a JWT |
| GET | `/api/auth/me` | auth | Current user |
| GET | `/api/dashboard/stats` | auth | Totals for the dashboard |
| GET | `/api/notifications` | auth | List; `page`, `limit`, `sort`, `search`, `type`, `status` |
| GET | `/api/notifications/:id` | auth | One notification with reporter |
| POST | `/api/notifications` | health_worker, registrar | Create notification |
| PATCH | `/api/notifications/:id` | registrar | Update status |
| DELETE | `/api/notifications/:id` | registrar | Delete notification |
| GET | `/api/analytics/notifications-per-month` | registrar | Birth/death totals by month |

Sort syntax is `field:direction`, for example `?sort=person_name:asc` or `?sort=createdAt:desc`. Allowed fields are whitelisted on the server. `page` starts at 1. List responses look like:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 8, "total": 10, "totalPages": 2 }
}
```

Errors use `{ "error": { "message": "...", "code": "..." } }`. Codes include `VALIDATION_ERROR`, `FUTURE_EVENT_DATE`, `DUPLICATE_NOTIFICATION`, `NOTIFICATION_NOT_FOUND`, `FORBIDDEN`, `EMAIL_TAKEN`, `EMAIL_NOT_REGISTERED`, `GOOGLE_SIGNIN_REQUIRED`, `GOOGLE_ACCOUNT_MISMATCH`, `GOOGLE_NOT_CONFIGURED` and `ROUTE_NOT_FOUND`.

### Account status and authorization

Signup rejects an already registered email with `EMAIL_TAKEN` and switches the UI to sign-in. Password login reports `EMAIL_NOT_REGISTERED` for unknown emails and `GOOGLE_SIGNIN_REQUIRED` for accounts linked to Google. Google sign-in verifies the email with Google before creating or linking an account; an existing email is linked instead of duplicated, and a different Google account for the same email is rejected with `GOOGLE_ACCOUNT_MISMATCH`. The Google response includes `isNewUser`, `existingEmail`, and a clear `message` for the success toast.

### API documentation

Swagger UI is available at `/api/Swagger_UI` with `/api/docs` as an alias, and the raw OpenAPI document is available at `/api/OpenAPI_JSON` with `/api/openapi.json` as an alias. All are public and work through the Vercel `/api` rewrite to the Render backend.

In Swagger UI, click **Authorize**, paste the JWT returned by signup, login, or Google sign-in, then use **Try it out** on protected endpoints. Health workers can create and read notifications; registrars can also update, delete, review, and view analytics.

## Server logs

Every request writes one structured line to the terminal, for example:

```text
[2026-11-18T10:32:14.021Z] [req-4] POST /api/notifications -> 201 (42ms) action=create_notification role=health_worker notification=668... type=birth
```

## Classroom activities

### 1. Role play

Open **Classroom activities**, pick health worker or registrar, and complete that role's checklist. Health workers create a notification; registrars clear the review queue.

### 2. Break the duplicate check

Press **Load sample** to copy a seeded name and event date, then press **Test duplicate**. The server returns `400 Bad Request`:

```json
{
  "error": {
    "code": "DUPLICATE_NOTIFICATION",
    "message": "A notification for Amara Wanjiku on 2026-11-16 already exists. Check the name and date before submitting again."
  }
}
```

No second record is saved. The client turns this into a clear banner.

## Verification

```bash
npm run lint
npm run build
npm run test:api
```

`test:api` starts a temporary API in memory mode and verifies `200`, `201`, `400`, `403` and `404` flows. It adapts the requested “5 Django tests” to the current Node/Express stack.

## Curl commands

Set a token once (bash/macOS/Linux):

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"health@register.test","password":"Health123!"}' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")
```

1. **Success — create a notification**:

```bash
curl -i -X POST http://localhost:4000/api/notifications -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"type":"birth","person_name":"Test Child","event_date":"2026-11-01"}'
```

Expected: `201 Created`.

2. **Failure — duplicate name and date**:

```bash
curl -i -X POST http://localhost:4000/api/notifications -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"type":"birth","person_name":"Test Child","event_date":"2026-11-01"}'
```

Expected: `400 Bad Request`, code `DUPLICATE_NOTIFICATION`.

3. **Failure — future event date**:

```bash
curl -i -X POST http://localhost:4000/api/notifications -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"type":"death","person_name":"Future Test","event_date":"2099-01-01"}'
```

Expected: `400 Bad Request`, code `FUTURE_EVENT_DATE`.

## Project structure

```text
client/
  index.html         Vite entry document
  vite.config.js     Dev server and /api proxy
  public/            Favicon
  src/
    components/      Shell, icons, status pills, terminal, state views
    pages/           Login, Overview, Notifications, CreateNotification,
                     NotificationDetail, ReviewQueue, Analytics, Activities
    api.js           Fetch wrapper with auth and typed errors
    utils.js         Formatting and domain metadata
    App.jsx          Auth state and hash-based routing
    index.css        Tailwind theme, base styles and form/login classes
    App.css          Dashboard, table, form, timeline and analytics classes
server/
  app.js             Express app, middleware and routes
  index.js           Server startup and storage mode banner
  db.js              MongoDB connection
  models.js          Mongoose schemas / validation rules
  store.js           Mongo + in-memory repository
  seed.js            Two users and ten notifications
  auth.js            Password hashing, JWT and role middleware
scripts/
  dev-all.js         Runs client and server together
  lint.js            Lightweight source checks
  smoke-test.js      API smoke tests
.env                 Paste your MongoDB connection string here
```

## Notes

This is a learning project. For production you would add refresh tokens, rate limiting, audit records, HTTPS, stronger unique-key handling, and a proper migration/deployment pipeline.
