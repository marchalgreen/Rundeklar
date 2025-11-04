export type OpenAPIDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  security?: Array<Record<string, string[]>>;
  paths: Record<string, any>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
  };
};

export const vendorSyncOpenAPI: OpenAPIDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Clairity Vendor Sync',
    version: '2024.10.0',
    description:
      'Clairity Vendor Sync API for orchestrating catalog imports, preview pipelines and registry actions.',
  },
  servers: [
    { url: 'https://api.clairity.dev', description: 'Production' },
    { url: 'https://staging.api.clairity.dev', description: 'Staging' },
  ],
  tags: [
    { name: 'Overview', description: 'Vendor health snapshots and summary metrics.' },
    { name: 'History', description: 'Recent sync runs across all vendors.' },
    { name: 'Registry', description: 'Registry utilities and bulk test runners.' },
    { name: 'Vendors', description: 'Vendor onboarding and connection management.' },
    { name: 'Normalization', description: 'Preview normalization results and apply decisions.' },
  ],
  security: [{ ServiceToken: [] }],
  paths: {
    '/vendor-sync/overview': {
      get: {
        tags: ['Overview'],
        summary: 'Fetch high-level vendor health summary.',
        description:
          'Returns vendor level readiness details including the last successful sync, item counts and any pending registry actions.',
        security: [{ ServiceToken: [] }],
        responses: {
          200: {
            description: 'Summary payload for all vendors currently registered.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vendors: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VendorSummary' },
                    },
                    nextRunAt: {
                      type: 'string',
                      format: 'date-time',
                      nullable: true,
                      description: 'Timestamp for the next scheduled apply run.',
                    },
                  },
                  required: ['vendors'],
                },
                example: {
                  vendors: [
                    {
                      slug: 'moscot',
                      displayName: 'Moscot',
                      status: 'ready',
                      lastSuccessfulSyncAt: '2024-09-12T10:00:00Z',
                      normalizedProducts: 1240,
                      pendingActions: 2,
                    },
                  ],
                  nextRunAt: '2024-09-13T02:00:00Z',
                },
              },
            },
          },
        },
      },
    },
    '/vendor-sync/history': {
      get: {
        tags: ['History'],
        summary: 'List recent vendor sync runs.',
        description: 'Paginated feed of the most recent sync runs across all vendors.',
        security: [{ ServiceToken: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Number of runs to return (max 100).',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        ],
        responses: {
          200: {
            description: 'Sync run collection ordered by start time desc.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    runs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VendorRun' },
                    },
                  },
                  required: ['runs'],
                },
                example: {
                  runs: [
                    {
                      runId: 'run_01J9ZQKX9QFFABCD',
                      vendor: 'moscot',
                      mode: 'apply',
                      status: 'success',
                      startedAt: '2024-09-12T07:30:11Z',
                      finishedAt: '2024-09-12T07:32:45Z',
                      totalItems: 215,
                      appliedItems: 209,
                      errorMessage: null,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/vendor-sync/registry/test-all': {
      post: {
        tags: ['Registry'],
        summary: 'Kick off registry-wide test runs.',
        description:
          'Enqueue preview runs for every vendor adapter. Use this before large promotions or to validate configuration updates.',
        security: [{ ServiceToken: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestAllRequest' },
              example: {
                includeDrafts: false,
                notificationEmail: 'ops@clairity.com',
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Test job accepted and queued.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['queued', 'running', 'completed'] },
                    runId: { type: 'string' },
                    startedAt: { type: 'string', format: 'date-time' },
                    vendors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          slug: { type: 'string' },
                          status: { type: 'string', enum: ['queued', 'running', 'complete'] },
                        },
                        required: ['slug', 'status'],
                      },
                    },
                  },
                  required: ['status', 'runId', 'vendors'],
                },
                example: {
                  status: 'queued',
                  runId: 'test-2024-09-12',
                  startedAt: '2024-09-12T07:00:00Z',
                  vendors: [
                    { slug: 'moscot', status: 'queued' },
                    { slug: 'raen', status: 'queued' },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/vendor-sync/vendors': {
      post: {
        tags: ['Vendors'],
        summary: 'Create or update a vendor connector.',
        description:
          'Registers a vendor adapter with credentials and sync cadence information. Ops can trigger this via the onboarding wizard.',
        security: [{ ServiceToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VendorCreateRequest' },
              example: {
                slug: 'new-vendor',
                displayName: 'New Vendor',
                syncWindow: { cron: '0 2 * * *', timezone: 'America/New_York' },
                connection: {
                  baseUrl: 'https://partners.new-vendor.com',
                  apiKey: '********',
                  scopes: ['catalog:read'],
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Vendor persisted and ready for testing.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VendorSummary' },
                example: {
                  slug: 'new-vendor',
                  displayName: 'New Vendor',
                  status: 'draft',
                  lastSuccessfulSyncAt: null,
                  normalizedProducts: 0,
                  pendingActions: 1,
                },
              },
            },
          },
        },
      },
    },
    '/vendor-sync/{slug}/normalize/preview': {
      post: {
        tags: ['Normalization'],
        summary: 'Preview normalization results for sample payloads.',
        description:
          'Runs the adapter normalize() logic for a single payload and returns the normalized product structure without persisting changes.',
        security: [{ ServiceToken: [] }],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Vendor slug registered in the registry.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sample: {
                    type: 'object',
                    description: 'Raw vendor payload captured from the source API.',
                  },
                  runId: {
                    type: 'string',
                    description: 'Optional run id to associate preview output with existing history.',
                    nullable: true,
                  },
                },
                required: ['sample'],
              },
              example: {
                sample: {
                  id: 'SKU-123',
                  title: 'Moscot Lemtosh',
                  color: 'Tortoise',
                  price: 295,
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Normalized product preview for review inside the registry UI.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    normalized: { $ref: '#/components/schemas/NormalizedProduct' },
                    validation: {
                      type: 'object',
                      properties: {
                        passed: { type: 'boolean' },
                        warnings: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                      },
                      required: ['passed', 'warnings'],
                    },
                  },
                  required: ['normalized', 'validation'],
                },
                example: {
                  normalized: {
                    id: 'SKU-123',
                    vendorProductId: 'SKU-123',
                    name: 'Moscot Lemtosh',
                    brand: 'Moscot',
                    status: 'active',
                    category: 'frames',
                    attributes: {
                      color: 'Tortoise',
                      shape: 'Panto',
                      material: 'Acetate',
                    },
                    pricing: {
                      currency: 'USD',
                      list: 295,
                      wholesale: 145,
                    },
                    inventory: {
                      quantity: 24,
                      locations: [{ id: 'bk', available: 12 }],
                    },
                    raw: {
                      id: 'SKU-123',
                      title: 'Moscot Lemtosh',
                      color: 'Tortoise',
                      price: 295,
                    },
                  },
                  validation: {
                    passed: true,
                    warnings: [],
                  },
                },
              },
            },
          },
        },
      },
    },
    '/vendor-sync/{slug}/apply': {
      post: {
        tags: ['Normalization'],
        summary: 'Apply previewed changes for a vendor.',
        description:
          'Commits the most recent preview run into production inventory. Only call this after Ops signs off in the registry.',
        security: [{ ServiceToken: [] }],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Vendor slug registered in the registry.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApplyRequest' },
              example: {
                runId: 'preview-2024-09-12T07:00:00Z',
                dryRun: false,
                notes: 'Ops approved after verifying price deltas.',
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Apply run accepted. Poll history for completion.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplyResponse' },
                example: {
                  status: 'queued',
                  vendor: 'moscot',
                  runId: 'apply-2024-09-12',
                  approvalsRequired: 0,
                  warnings: [],
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ServiceToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Service-to-service JWT minted from Clairity with the catalog:sync scopes. Include as `Authorization: Bearer <token>`.',
      },
    },
    schemas: {
      VendorSummary: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          displayName: { type: 'string' },
          status: { type: 'string', enum: ['ready', 'draft', 'error', 'disabled'] },
          lastSuccessfulSyncAt: { type: 'string', format: 'date-time', nullable: true },
          normalizedProducts: { type: 'integer', minimum: 0 },
          pendingActions: { type: 'integer', minimum: 0 },
        },
        required: ['slug', 'displayName', 'status', 'normalizedProducts', 'pendingActions'],
      },
      VendorRun: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          vendor: { type: 'string' },
          mode: { type: 'string', enum: ['preview', 'apply', 'test'] },
          status: { type: 'string', enum: ['queued', 'running', 'success', 'error'] },
          startedAt: { type: 'string', format: 'date-time' },
          finishedAt: { type: 'string', format: 'date-time', nullable: true },
          totalItems: { type: 'integer', nullable: true },
          appliedItems: { type: 'integer', nullable: true },
          errorMessage: { type: 'string', nullable: true },
        },
        required: ['runId', 'vendor', 'mode', 'status', 'startedAt'],
      },
      VendorConnection: {
        type: 'object',
        properties: {
          baseUrl: { type: 'string', format: 'uri' },
          apiKey: { type: 'string' },
          scopes: {
            type: 'array',
            description: 'Scoped permissions provisioned with the vendor.',
            items: { type: 'string' },
          },
          additionalHeaders: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['baseUrl', 'apiKey'],
      },
      SyncWindow: {
        type: 'object',
        properties: {
          cron: { type: 'string', description: 'Cron expression used for scheduled apply runs.' },
          timezone: { type: 'string', description: 'IANA timezone string for the cron expression.' },
        },
        required: ['cron', 'timezone'],
      },
      VendorCreateRequest: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          displayName: { type: 'string' },
          connection: { $ref: '#/components/schemas/VendorConnection' },
          syncWindow: { $ref: '#/components/schemas/SyncWindow' },
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
              },
              required: ['email'],
            },
          },
        },
        required: ['slug', 'displayName', 'connection'],
      },
      TestAllRequest: {
        type: 'object',
        properties: {
          includeDrafts: {
            type: 'boolean',
            description: 'If true, adapters that are not yet live are included in the run.',
            default: false,
          },
          notificationEmail: {
            type: 'string',
            format: 'email',
            nullable: true,
            description: 'Optional email address for completion notifications.',
          },
        },
      },
      NormalizedProduct: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vendorProductId: { type: 'string' },
          name: { type: 'string' },
          brand: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
          sku: { type: 'string', nullable: true },
          attributes: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          pricing: {
            type: 'object',
            properties: {
              currency: { type: 'string' },
              list: { type: 'number', format: 'float' },
              wholesale: { type: 'number', format: 'float', nullable: true },
            },
            required: ['currency', 'list'],
          },
          inventory: {
            type: 'object',
            properties: {
              quantity: { type: 'integer', nullable: true },
              locations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    available: { type: 'integer' },
                  },
                  required: ['id', 'available'],
                },
              },
            },
          },
          media: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                primary: { type: 'boolean' },
              },
            },
          },
          raw: {
            type: 'object',
            description: 'Original vendor payload persisted for debugging.',
          },
        },
        required: ['id', 'vendorProductId', 'name', 'brand', 'category', 'status', 'pricing', 'raw'],
      },
      ApplyRequest: {
        type: 'object',
        properties: {
          runId: {
            type: 'string',
            description: 'Preview run id to apply. When omitted the latest approved preview is used.',
            nullable: true,
          },
          dryRun: {
            type: 'boolean',
            description: 'If true, the apply run performs validations but does not persist items.',
            default: false,
          },
          notes: {
            type: 'string',
            description: 'Operator notes captured in the audit log.',
            nullable: true,
          },
        },
      },
      ApplyResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['queued', 'running', 'completed'] },
          vendor: { type: 'string' },
          runId: { type: 'string' },
          approvalsRequired: { type: 'integer' },
          warnings: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['status', 'vendor', 'runId', 'approvalsRequired', 'warnings'],
      },
    },
  },
};
