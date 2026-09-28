export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Campus Resource Exchange (CRX) API',
    version: '1.0.0',
    description:
      'REST API for Campus Resource Exchange: authentication, physical and digital academic resources, borrowing state machine, student requests, notifications, reports, and administrative governance.',
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'crx_access_token',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      csrfHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Minimal service health check',
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a verified college student account',
        responses: {
          '201': { description: 'Account created and authenticated' },
          '400': { description: 'Validation error or non-allowed college email domain' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate with college email and password',
        responses: {
          '200': { description: 'Authenticated' },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke current session token and clear cookie',
        responses: {
          '200': { description: 'Signed out' },
        },
      },
    },
    '/api/resources': {
      get: {
        tags: ['Resources'],
        summary: 'List and filter approved campus resources',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'semester', in: 'query', schema: { type: 'string' } },
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'resourceType', in: 'query', schema: { type: 'string' } },
          { name: 'lendingType', in: 'query', schema: { type: 'string' } },
          { name: 'availableOnly', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': { description: 'Filtered catalog listings' },
        },
      },
      post: {
        tags: ['Resources'],
        security: [{ cookieAuth: [], csrfHeader: [] }, { bearerAuth: [] }],
        summary: 'Create a physical or digital resource listing',
        responses: {
          '201': { description: 'Resource created' },
          '400': { description: 'Validation or file signature error' },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/api/resources/{id}': {
      get: {
        tags: ['Resources'],
        summary: 'Inspect resource details, borrow history, and contextual messages',
        responses: {
          '200': { description: 'Resource details' },
          '404': { description: 'Resource not found' },
        },
      },
      delete: {
        tags: ['Resources'],
        security: [{ cookieAuth: [], csrfHeader: [] }, { bearerAuth: [] }],
        summary: 'Delete own resource listing or remove as administrator',
        responses: {
          '200': { description: 'Resource removed' },
          '403': { description: 'Forbidden (IDOR protection)' },
        },
      },
    },
    '/api/resources/{id}/download': {
      get: {
        tags: ['Resources'],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        summary: 'Stream moderator-approved digital study material',
        responses: {
          '200': { description: 'Binary file stream' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Resource not yet approved by moderator' },
        },
      },
    },
    '/api/resources/{id}/requests': {
      post: {
        tags: ['Borrowing'],
        security: [{ cookieAuth: [], csrfHeader: [] }, { bearerAuth: [] }],
        summary: 'Submit a borrow or giveaway request for an available physical resource',
        responses: {
          '201': { description: 'Borrow request created' },
          '400': { description: 'Resource unavailable or owned by requester' },
        },
      },
    },
    '/api/borrow-requests/{id}/transition': {
      patch: {
        tags: ['Borrowing'],
        security: [{ cookieAuth: [], csrfHeader: [] }, { bearerAuth: [] }],
        summary:
          'Transition borrow state machine (REQUESTED -> APPROVED -> BORROWED -> RETURN_REQUESTED -> RETURNED)',
        responses: {
          '200': { description: 'State transition applied' },
          '400': { description: 'Invalid state transition' },
          '403': { description: 'Unauthorized actor for this transition' },
        },
      },
    },
    '/api/resource-requests': {
      get: {
        tags: ['Requests'],
        summary: 'List open student academic resource requests',
        responses: {
          '200': { description: 'Open resource need requests' },
        },
      },
      post: {
        tags: ['Requests'],
        security: [{ cookieAuth: [], csrfHeader: [] }, { bearerAuth: [] }],
        summary: 'Post a new student resource need request',
        responses: {
          '201': { description: 'Need request posted' },
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        summary: 'Retrieve notifications for authenticated student',
        responses: {
          '200': { description: 'Notifications list' },
        },
      },
    },
    '/api/reports': {
      post: {
        tags: ['Reports'],
        security: [{ cookieAuth: [], csrfHeader: [] }, { bearerAuth: [] }],
        summary: 'Submit a moderation or copyright report on a resource or message',
        responses: {
          '201': { description: 'Report logged for moderator review' },
        },
      },
    },
    '/api/admin/overview': {
      get: {
        tags: ['Admin APIs'],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        summary: 'Retrieve moderation queue, users, reports, and security audit log (Admin only)',
        responses: {
          '200': { description: 'Admin governance overview' },
          '403': { description: 'Administrator role required' },
        },
      },
    },
  },
};

export interface AggregateAnalyticsStore {
  page_view: number;
  resource_search: number;
  resource_view: number;
  resource_download: number;
  resource_request: number;
  exchange_completed: number;
}

export const aggregateAnalytics: AggregateAnalyticsStore = {
  page_view: 0,
  resource_search: 0,
  resource_view: 0,
  resource_download: 0,
  resource_request: 0,
  exchange_completed: 0,
};
