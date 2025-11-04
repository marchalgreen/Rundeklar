import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';
import type { NextRequest } from 'next/server';

/**
 * Local stand-in for IntegrationType since the Prisma enum
 * isn’t exported in this branch.
 */
type IntegrationKind = 'SCRAPER' | 'API';
const IntegrationType = {
  SCRAPER: 'SCRAPER' as IntegrationKind,
  API: 'API' as IntegrationKind,
} as const;

const SERVICE_SECRET = new TextEncoder().encode(
  process.env.SERVICE_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'service-dev-secret-change-me',
);

async function createToken(scopes: string | string[]) {
  return new SignJWT({ scopes, sub: 'service-test', aud: 'clairity-services' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(SERVICE_SECRET);
}

class MockRequest {
  url: string;
  method = 'POST';
  headers: Headers;
  private body: unknown;

  constructor(url: string, init: { headers?: Record<string, string>; body?: unknown } = {}) {
    this.url = url;
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }

  async json(): Promise<unknown> {
    if (this.body === undefined) {
      throw new Error('No body provided');
    }
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }
}

type TransactionStub = {
  vendorCatalogItem: {
    create(args: unknown): Promise<unknown>;
    createMany(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<{ count: number }>;
  };
  vendorSyncState: {
    upsert(args: unknown): Promise<unknown>;
  };
};

/**
 * Prisma stub for the run-tracking flow.
 */
function buildPrismaStub() {
  return {
    vendor: {
      async findUnique(args: { where: { slug: string } }) {
        if (args.where.slug !== 'moscot') return null;
        return {
          id: 'vendor_moscot',
          slug: 'moscot',
          name: 'MOSCOT',
          integration: {
            id: 'integration_moscot',
            type: IntegrationType.SCRAPER,
            scraperPath: null,
            apiBaseUrl: null,
            apiAuthType: null,
            apiKey: null,
            lastTestAt: null,
            lastTestOk: null,
            meta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      },
    },

    vendorCatalogItem: {
      async findMany() {
        // empty so dry-run uses “created” path with injected items
        return [];
      },
    },

    vendorSyncRun: {
      async create() {
        return { id: 'run_test' };
      },
      async update() {
        return {};
      },
    },

    vendorSyncRunDiff: {
      async create() {
        return {};
      },
    },

    vendorSyncState: {
      async findUnique() {
        return null;
      },
      async create() {
        return {};
      },
      async upsert() {
        return {};
      },
      async update() {
        return {};
      },
    },

    async $transaction(fn: (tx: TransactionStub) => Promise<unknown>) {
      const tx: TransactionStub = {
        vendorCatalogItem: {
          async create() {
            return {};
          },
          async createMany() {
            return {};
          },
          async update() {
            return {};
          },
          async deleteMany() {
            return { count: 0 };
          },
        },
        vendorSyncState: {
          async upsert() {
            return {};
          },
        },
      };
      return fn(tx);
    },
  };
}

// Inject stub before importing the route
(globalThis as any).__PRISMA__ = buildPrismaStub();

// Import the generic vendor sync route for Next.js App Router
const routeModulePromise = import(
  '../../../packages/web/src/app/api/catalog/vendor-sync/[slug]/sync/route'
);

function makeContext(slug: string) {
  return { params: { slug } } as { params: { slug: string } };
}

function makeRequest(url: string, init: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  return new MockRequest(url, { headers, body: init.body });
}

test('POST /api/catalog/vendor-sync/:slug/sync requires token', async () => {
  const mod = await routeModulePromise;
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/sync');
  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 401);
  assert.equal(payload.ok, false);
  assert.equal(payload.error || payload.code, 'missing_token');
});

test('POST /api/catalog/vendor-sync/:slug/sync rejects insufficient scope', async () => {
  const mod = await routeModulePromise;
  const token = await createToken('catalog:sync:read');
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/sync', { token });
  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 403);
  assert.equal(payload.ok, false);
  assert.equal(payload.error || payload.code, 'insufficient_scope');
});

test('POST /api/catalog/vendor-sync/:slug/sync performs dry run by default', async () => {
  const mod = await routeModulePromise;
  const token = await createToken('catalog:sync:write');
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/sync', {
    token,
    body: {
      inject: [{ catalogId: 'ALPHA', name: 'Alpha' }],
    },
  });

  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, 'dryRun');
  assert.equal(payload.summary.dryRun, true);
  assert.equal(payload.summary.total, 1);
  assert.equal(payload.summary.created, 1);
  assert.equal(payload.summary.updated, 0);
  assert.equal(payload.summary.removed, 0);
});

test('POST /api/catalog/vendor-sync/:slug/sync supports apply mode', async () => {
  const mod = await routeModulePromise;
  const token = await createToken('catalog:sync:write');
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/sync', {
    token,
    body: {
      inject: [{ catalogId: 'BETA', name: 'Beta' }],
      mode: 'apply',
    },
  });

  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, 'apply');
  assert.equal(payload.summary.dryRun, false);
});

test('POST /api/catalog/vendor-sync/:slug/sync handles missing vendor', async () => {
  const mod = await routeModulePromise;
  const token = await createToken('catalog:sync:write');
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/unknown/sync', { token });

  const res = await mod.POST(req as unknown as NextRequest, makeContext('unknown'));
  const payload = await res.json();

  assert.equal(res.status, 404);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'vendor_not_configured');
});
