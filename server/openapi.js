export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Birth & Death Notification Register API',
    version: '1.0.0',
    description:
      'Role-aware API for submitting, reviewing, and tracking birth and death notifications. Health workers can create and read notifications. Registrars can create, read, update, delete, review, and view analytics.',
  },
  servers: [{ url: '/api', description: 'Current deployment' }],
  tags: [
    { name: 'System', description: 'Health and documentation endpoints' },
    { name: 'Auth', description: 'Account creation and sign-in' },
    { name: 'Notifications', description: 'Birth and death notification records' },
    { name: 'Analytics', description: 'Aggregated reporting data' },
    { name: 'Dashboard', description: 'Dashboard summary data' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT returned by signup, login, or Google sign-in.',
      },
    },
    responses: {
      BadRequest: {
        description: 'Request validation failed.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Unauthorized: {
        description: 'Missing, invalid, or expired bearer token.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Authenticated user does not have the required role.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Requested record was not found.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '668a3f2c9d1f4a0012ab34cd' },
          name: { type: 'string', example: 'Amara Wanjiku' },
          email: { type: 'string', format: 'email', example: 'amara@example.com' },
          role: { type: 'string', enum: ['health_worker', 'registrar'], example: 'health_worker' },
          sector: { type: 'string', example: 'Kigali' },
          googleId: { type: 'string', nullable: true, example: null },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT to send as `Authorization: Bearer <token>`.' },
          user: { $ref: '#/components/schemas/User' },
          message: { type: 'string', description: 'Clear sign-in or account status message.' },
          isNewUser: {
            type: 'boolean',
            description: 'Google sign-in only. True when a new account was created.',
          },
          existingEmail: {
            type: 'boolean',
            description: 'Google sign-in only. True when the email was already registered.',
          },
        },
      },
      SignupRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, example: 'Amara Wanjiku' },
          email: { type: 'string', format: 'email', example: 'amara@example.com' },
          password: { type: 'string', minLength: 6, format: 'password', example: 'secret123' },
          sector: { type: 'string', maxLength: 80, example: 'Kigali' },
        },
        description: 'New accounts are always created as `health_worker`; a submitted role is ignored.',
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'amara@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' },
        },
      },
      GoogleRequest: {
        type: 'object',
        required: ['accessToken'],
        properties: {
          accessToken: {
            type: 'string',
            description: 'Google Identity Services access token with the `email` scope.',
          },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '668a3f2c9d1f4a0012ab34cd' },
          type: { type: 'string', enum: ['birth', 'death'], example: 'birth' },
          person_name: { type: 'string', example: 'Amara Wanjiku' },
          event_date: { type: 'string', format: 'date', example: '2026-11-16' },
          status: {
            type: 'string',
            enum: ['pending', 'under_review', 'registered', 'rejected'],
            example: 'pending',
          },
          reporter_id: { type: 'string', example: '668a3f2c9d1f4a0012ab34cd' },
          reporter: { $ref: '#/components/schemas/User', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationCreate: {
        type: 'object',
        required: ['type', 'person_name', 'event_date'],
        properties: {
          type: { type: 'string', enum: ['birth', 'death'], example: 'birth' },
          person_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Amara Wanjiku' },
          event_date: { type: 'string', format: 'date', example: '2026-11-16' },
        },
        description: 'New records always start with status `pending`.',
      },
      NotificationUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          type: { type: 'string', enum: ['birth', 'death'] },
          person_name: { type: 'string', minLength: 2, maxLength: 100 },
          event_date: { type: 'string', format: 'date' },
          status: {
            type: 'string',
            enum: ['pending', 'under_review', 'registered', 'rejected'],
          },
        },
        description: 'Registrar only. The UI exposes status changes; the API accepts other allowed fields too.',
      },
      NotificationList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 6 },
              total: { type: 'integer', example: 14 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      DeletedNotification: {
        type: 'object',
        properties: {
          deleted: { type: 'boolean', example: true },
          notification: { $ref: '#/components/schemas/Notification' },
        },
      },
      DashboardStats: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          pending: { type: 'integer' },
          underReview: { type: 'integer' },
          registered: { type: 'integer' },
          rejected: { type: 'integer' },
          births: { type: 'integer' },
          deaths: { type: 'integer' },
          thisMonth: { type: 'integer' },
        },
      },
      MonthlyAnalytics: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          births: { type: 'integer' },
          deaths: { type: 'integer' },
          months: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                month: { type: 'string', example: '2026-11' },
                label: { type: 'string', example: 'Nov 2026' },
                births: { type: 'integer' },
                deaths: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          storage: { type: 'string', enum: ['mongodb', 'memory fallback'], example: 'mongodb' },
          uptimeSeconds: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Forbidden' },
              code: { type: 'string', example: 'FORBIDDEN' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    '/Swagger_UI': {
      get: {
        tags: ['System'],
        operationId: 'getSwaggerUi',
        summary: 'Open Swagger UI',
        description: 'Alias: `/docs`. Public interactive API documentation.',
        security: [],
        responses: {
          200: {
            description: 'Swagger UI HTML page.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/OpenAPI_JSON': {
      get: {
        tags: ['System'],
        operationId: 'getOpenApiJson',
        summary: 'Get the OpenAPI document',
        description: 'Alias: `/openapi.json`. Public OpenAPI 3 JSON document.',
        security: [],
        responses: {
          200: {
            description: 'OpenAPI document.',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        operationId: 'getHealth',
        summary: 'Check API health and storage mode',
        security: [],
        responses: {
          200: {
            description: 'API is running.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        operationId: 'signup',
        summary: 'Create a health worker account',
        description: 'Public endpoint. Role escalation is ignored; the created account is always `health_worker`.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } },
        },
        responses: {
          201: {
            description: 'Account created.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        operationId: 'login',
        summary: 'Sign in with email and password',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: {
            description: 'Signed in.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        operationId: 'googleSignIn',
        summary: 'Sign in or sign up with Google',
        description:
          'Public endpoint. Verifies the Google email with Google before creating or linking an account. First-time emails become `health_worker`; existing verified emails sign in to their current account and are never duplicated. Returns `isNewUser`, `existingEmail`, and a clear `message`.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GoogleRequest' } } },
        },
        responses: {
          200: {
            description: 'Signed in.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        operationId: 'getCurrentUser',
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        operationId: 'getDashboardStats',
        summary: 'Get dashboard totals',
        description: 'Available to `health_worker` and `registrar`.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard totals.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        operationId: 'listNotifications',
        summary: 'List notifications',
        description:
          'Available to `health_worker` and `registrar`. Both roles can read all records; there is no owner filter.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 6 } },
          {
            name: 'sort',
            in: 'query',
            description: 'Format: `field:direction`. Allowed fields: type, person_name, event_date, status, createdAt, updatedAt.',
            schema: { type: 'string', example: 'createdAt:desc' },
          },
          { name: 'search', in: 'query', description: 'Case-insensitive person name search.', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['birth', 'death'] } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'under_review', 'registered', 'rejected'] },
          },
        ],
        responses: {
          200: {
            description: 'Paginated notifications.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationList' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Notifications'],
        operationId: 'createNotification',
        summary: 'Create a notification',
        description: 'Available to `health_worker` and `registrar`. Duplicate name/date pairs are rejected.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationCreate' } } },
        },
        responses: {
          201: {
            description: 'Notification created.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/notifications/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } },
      ],
      get: {
        tags: ['Notifications'],
        operationId: 'getNotification',
        summary: 'Get one notification',
        description: 'Available to `health_worker` and `registrar`.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Notification detail.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Notifications'],
        operationId: 'updateNotification',
        summary: 'Update a notification',
        description: 'Registrar only. The dashboard UI uses this to change review status.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationUpdate' } } },
        },
        responses: {
          200: {
            description: 'Notification updated.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Notifications'],
        operationId: 'deleteNotification',
        summary: 'Delete a notification',
        description: 'Registrar only.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Notification deleted.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DeletedNotification' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/analytics/notifications-per-month': {
      get: {
        tags: ['Analytics'],
        operationId: 'getMonthlyAnalytics',
        summary: 'Get monthly birth/death totals',
        description: 'Registrar only.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Monthly analytics.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MonthlyAnalytics' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
}

export const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Birth & Death Notification Register API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.29.5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f5f7fa; }
      .topbar { padding: 12px 20px; background: #064e3b; color: #fff; font: 600 14px system-ui, sans-serif; }
      .topbar a { color: #d1fae5; }
    </style>
  </head>
  <body>
    <div class="topbar">
      Birth & Death Notification Register API ·
      <a href="/api/OpenAPI_JSON">OpenAPI_JSON</a>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.29.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.29.5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/OpenAPI_JSON',
          dom_id: '#swagger-ui',
          deepLinking: true,
          persistAuthorization: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'StandaloneLayout',
        })
      }
    </script>
  </body>
</html>
`
