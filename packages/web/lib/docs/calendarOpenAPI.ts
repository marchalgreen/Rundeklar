export const calendarOpenAPISpec = {
  openapi: '3.1.0',
  info: {
    title: 'Clairity Calendar API',
    version: '1.0.0',
    description:
      'Programmatic access to Clairity scheduling, including availability search, booking management, reminders, and webhook notifications.',
    contact: {
      name: 'Clairity Support',
      email: 'support@clairity.com',
      url: 'https://docs.clairity.com',
    },
  },
  servers: [
    { url: 'https://api.clairity.com', description: 'Production' },
    { url: 'https://sandbox.api.clairity.local', description: 'Sandbox' },
  ],
  tags: [
    { name: 'Availability', description: 'Query and manage provider availability.' },
    { name: 'Events', description: 'Create and manage appointments.' },
    { name: 'Providers', description: 'Manage schedulable resources.' },
    { name: 'Reminders', description: 'Automated messaging policies.' },
    { name: 'ICS Imports', description: 'Sync external calendars into Clairity.' },
    { name: 'Webhooks', description: 'Receive change notifications.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      AvailabilityResponse: {
        type: 'object',
        properties: {
          locationId: { type: 'string' },
          range: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' },
            },
            required: ['start', 'end'],
          },
          providers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                providerId: { type: 'string' },
                slots: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      startsAt: { type: 'string', format: 'date-time' },
                      endsAt: { type: 'string', format: 'date-time' },
                      serviceIds: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      capacity: { type: 'integer', minimum: 0 },
                      overlays: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            label: { type: 'string' },
                            startsAt: { type: 'string', format: 'date-time' },
                            endsAt: { type: 'string', format: 'date-time' },
                          },
                          required: ['type', 'startsAt', 'endsAt'],
                        },
                      },
                    },
                    required: ['startsAt', 'endsAt', 'serviceIds', 'capacity'],
                  },
                },
              },
              required: ['providerId', 'slots'],
            },
          },
        },
        required: ['locationId', 'range', 'providers'],
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          providerId: { type: 'string' },
          serviceId: { type: 'string' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
            },
            required: ['name'],
          },
          startsAt: { type: 'string', format: 'date-time' },
          durationMinutes: { type: 'integer' },
          notes: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'] },
          metadata: { type: 'object', additionalProperties: true },
        },
        required: ['id', 'providerId', 'serviceId', 'customer', 'startsAt', 'durationMinutes', 'status'],
      },
      Provider: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          locationId: { type: 'string' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          specialties: {
            type: 'array',
            items: { type: 'string' },
          },
          slotTemplate: {
            type: 'object',
            properties: {
              slotDurationMinutes: { type: 'integer' },
              bufferBeforeMinutes: { type: 'integer', nullable: true },
              bufferAfterMinutes: { type: 'integer', nullable: true },
              weeklyHours: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            required: ['slotDurationMinutes', 'weeklyHours'],
          },
          archived: { type: 'boolean' },
        },
        required: ['id', 'name', 'locationId', 'slotTemplate', 'archived'],
      },
      ReminderPolicy: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          target: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['service', 'location'] },
              id: { type: 'string' },
            },
            required: ['type', 'id'],
          },
          timezone: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                offset: { type: 'string' },
                channel: { type: 'string', enum: ['email', 'sms', 'push'] },
                templateId: { type: 'string' },
              },
              required: ['offset', 'channel', 'templateId'],
            },
          },
        },
        required: ['id', 'target', 'timezone', 'steps'],
      },
      WebhookSubscription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          events: {
            type: 'array',
            items: { type: 'string' },
          },
          secret: { type: 'string' },
        },
        required: ['id', 'url', 'events', 'secret'],
      },
      Problem: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'integer' },
          detail: { type: 'string' },
          traceId: { type: 'string' },
          fields: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['type', 'title', 'status'],
      },
    },
  },
  paths: {
    '/api/calendar/v1/availability': {
      get: {
        tags: ['Availability'],
        summary: 'Search provider availability',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'start',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'end',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'providerIds',
            in: 'query',
            required: false,
            schema: { type: 'string', description: 'Comma separated provider IDs.' },
          },
          {
            name: 'serviceIds',
            in: 'query',
            required: false,
            schema: { type: 'string', description: 'Comma separated service IDs.' },
          },
        ],
        responses: {
          '200': {
            description: 'Availability found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AvailabilityResponse' },
              },
            },
          },
          '400': { description: 'Invalid filters', content: { 'application/json': { schema: { $ref: '#/components/schemas/Problem' } } } },
        },
      },
    },
    '/api/calendar/v1/availability/templates': {
      post: {
        tags: ['Availability'],
        summary: 'Create or replace an availability template',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  providerId: { type: 'string' },
                  effectiveFrom: { type: 'string', format: 'date' },
                  patch: { type: 'boolean' },
                  rules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        day: { type: 'string' },
                        open: { type: 'string' },
                        close: { type: 'string' },
                      },
                      required: ['day', 'open', 'close'],
                    },
                  },
                },
                required: ['providerId', 'effectiveFrom', 'rules'],
              },
            },
          },
        },
        responses: {
          '204': { description: 'Template accepted' },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Problem' } } } },
        },
      },
    },
    '/api/calendar/v1/availability/overrides': {
      post: {
        tags: ['Availability'],
        summary: 'Create a single-day override',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  providerId: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  opensAt: { type: 'string', format: 'time' },
                  closesAt: { type: 'string', format: 'time' },
                },
                required: ['providerId', 'date', 'opensAt', 'closesAt'],
              },
            },
          },
        },
        responses: {
          '204': { description: 'Override accepted' },
        },
      },
    },
    '/api/calendar/v1/events': {
      post: {
        tags: ['Events'],
        summary: 'Create an event',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  providerId: { type: 'string' },
                  serviceId: { type: 'string' },
                  customer: { $ref: '#/components/schemas/Event/properties/customer' },
                  startsAt: { type: 'string', format: 'date-time' },
                  durationMinutes: { type: 'integer' },
                  notes: { type: 'string', nullable: true },
                },
                required: ['providerId', 'serviceId', 'customer', 'startsAt', 'durationMinutes'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Event created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Event' } },
            },
            headers: {
              Location: { schema: { type: 'string', format: 'uri' } },
            },
          },
          '409': { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Problem' } } } },
        },
      },
    },
    '/api/calendar/v1/events/{eventId}': {
      parameters: [
        {
          name: 'eventId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      get: {
        tags: ['Events'],
        summary: 'Get an event',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Event', content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Events'],
        summary: 'Update event fields',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  startsAt: { type: 'string', format: 'date-time' },
                  durationMinutes: { type: 'integer' },
                  status: { type: 'string' },
                  notes: { type: 'string', nullable: true },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated event', content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
        },
      },
      delete: {
        tags: ['Events'],
        summary: 'Cancel an event',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Cancelled' },
        },
      },
    },
    '/api/calendar/v1/providers': {
      get: {
        tags: ['Providers'],
        summary: 'List providers',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Providers',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Provider' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Providers'],
        summary: 'Create provider',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/Provider' }],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Provider created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Provider' } } },
          },
        },
      },
    },
    '/api/calendar/v1/providers/{providerId}': {
      parameters: [
        {
          name: 'providerId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      patch: {
        tags: ['Providers'],
        summary: 'Update provider',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  specialties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  archived: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Provider', content: { 'application/json': { schema: { $ref: '#/components/schemas/Provider' } } } },
        },
      },
    },
    '/api/calendar/v1/reminders': {
      get: {
        tags: ['Reminders'],
        summary: 'List reminder policies',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Policies',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ReminderPolicy' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reminders'],
        summary: 'Create or update a reminder policy',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReminderPolicy' },
            },
          },
        },
        responses: {
          '200': { description: 'Policy saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReminderPolicy' } } } },
        },
      },
    },
    '/api/calendar/v1/reminders/test': {
      post: {
        tags: ['Reminders'],
        summary: 'Send a test reminder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  policyId: { type: 'string' },
                  channel: { type: 'string', enum: ['email', 'sms', 'push'] },
                  recipient: {
                    type: 'object',
                    additionalProperties: true,
                  },
                },
                required: ['policyId', 'channel', 'recipient'],
              },
            },
          },
        },
        responses: {
          '202': { description: 'Test enqueued' },
        },
      },
    },
    '/api/calendar/v1/ics-imports': {
      post: {
        tags: ['ICS Imports'],
        summary: 'Create an ICS import job',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  providerId: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  credentials: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' },
                    },
                  },
                  serviceMappings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        uidPrefix: { type: 'string' },
                        serviceId: { type: 'string' },
                      },
                      required: ['uidPrefix', 'serviceId'],
                    },
                  },
                },
                required: ['providerId', 'url'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Import job created' },
        },
      },
    },
    '/api/calendar/v1/ics-imports/{importId}/resync': {
      parameters: [
        {
          name: 'importId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      post: {
        tags: ['ICS Imports'],
        summary: 'Trigger a manual resync',
        security: [{ bearerAuth: [] }],
        responses: {
          '202': { description: 'Resync started' },
        },
      },
    },
    '/api/calendar/v1/webhooks': {
      post: {
        tags: ['Webhooks'],
        summary: 'Register a webhook subscription',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookSubscription' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookSubscription' } } },
          },
        },
      },
    },
  },
} as const;

export const calendarOpenAPI = calendarOpenAPISpec;

export type CalendarOpenAPISpec = typeof calendarOpenAPISpec;
