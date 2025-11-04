import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';

import { makeRequest, MockRequest } from '../../mocks/request';

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

type IntegrationRecord = {
  id: string;
  vendorId: string;
  type: 'SCRAPER' | 'API';
  scraperPath: string | null;
  apiBaseUrl: string | null;
  apiAuthType: string | null;
  apiKey: string | null;
  lastTestAt: Date | null;
  lastTestOk: boolean | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

type VendorRecord = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  integration: IntegrationRecord | null;
};

type VendorStateRecord = {
  vendor: string;
  lastRunAt: Date | null;
  totalItems: number;
  lastError: string | null;
  lastDurationMs: number | null;
  lastHash: string | null;
  lastSource: string | null;
  lastRunBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createPrismaStub() {
  const now = new Date('2024-05-01T12:00:00Z');
  const data = {
    vendors: [
      {
        id: 'vendor_moscot',
        slug: 'moscot',
        name: 'MOSCOT',
        createdAt: now,
        updatedAt: now,
        integration: {
          id: 'integration_moscot',
          vendorId: 'vendor_moscot',
          type: 'SCRAPER' as const,
          scraperPath: '/tmp/moscot.catalog.json',
          apiBaseUrl: null,
          apiAuthType: null,
          apiKey: null,
          lastTestAt: null,
          lastTestOk: null,
          meta: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'vendor_api',
        slug: 'api-only',
        name: 'API Only',
        createdAt: now,
        updatedAt: now,
        integration: {
          id: 'integration_api',
          vendorId: 'vendor_api',
          type: 'API' as const,
          scraperPath: null,
          apiBaseUrl: 'https://api.example.test',
          apiAuthType: 'API_KEY',
          apiKey: 'secret',
          lastTestAt: null,
          lastTestOk: null,
          meta: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'vendor_missing',
        slug: 'missing',
        name: 'Missing Integration',
        createdAt: now,
        updatedAt: now,
        integration: null,
      },
    ] as VendorRecord[],
    states: [
      {
        vendor: 'moscot',
        lastRunAt: new Date('2024-04-30T08:00:00Z'),
        totalItems: 120,
        lastError: null,
        lastDurationMs: 4200,
        lastHash: 'hash123',
        lastSource: 'manual',
        lastRunBy: 'system',
        createdAt: now,
        updatedAt: now,
      },
      {
        vendor: 'api-only',
        lastRunAt: new Date('2024-04-28T10:15:00Z'),
        totalItems: 50,
        lastError: 'Timeout',
        lastDurationMs: 9000,
        lastHash: null,
        lastSource: null,
        lastRunBy: null,
        createdAt: now,
        updatedAt: now,
      },
    ] as VendorStateRecord[],
  };

  return {
    vendor: {
      async findMany() {
        return data.vendors.map((vendor) => ({ ...vendor }));
      },
      async findUnique(args: { where: { slug?: string; id?: string }; include?: { integration?: boolean } }) {
        const { slug, id } = args.where;
        const match = data.vendors.find(
          (vendor) => (slug && vendor.slug === slug) || (id && vendor.id === id),
        );
        if (!match) return null;
        if (args.include?.integration) {
          return { ...match, integration: match.integration ? { ...match.integration } : null };
        }
        return { ...match };
      },
    },
    vendorIntegration: {
      async update(args: { where: { id: string }; data: Partial<IntegrationRecord> }) {
        const record = data.vendors
          .map((vendor) => vendor.integration)
          .find((integration) => integration && integration.id === args.where.id);
        if (!record) {
          throw new Error(`Integration ${args.where.id} not found`);
        }
        Object.assign(record, args.data);
        return { ...record };
      },
    },
    vendorSyncState: {
      async findMany(args: { where: { vendor: { in: string[] } } }) {
        const list = args.where.vendor.in;
        return data.states
          .filter((state) => list.includes(state.vendor))
          .map((state) => ({ ...state }));
      },
    },
    __data: data,
  };
}

const prismaStub = createPrismaStub();
const hadExistingPrisma = Object.prototype.hasOwnProperty.call(globalThis, '__PRISMA__');
const previousPrisma = (globalThis as any).__PRISMA__;
(globalThis as any).__PRISMA__ = prismaStub;

const routeModulePromise = import(
  '../../../packages/web/src/app/api/catalog/vendor-sync/registry/test-all/route.ts',
);

const TEST_URL = new URL(
  '/api/catalog/vendor-sync/registry/test-all',
  'https://example.test',
).toString();

test.after(() => {
  if (hadExistingPrisma) {
    (globalThis as any).__PRISMA__ = previousPrisma;
  } else {
    delete (globalThis as any).__PRISMA__;
  }
});

test('POST /api/catalog/vendor-sync/registry/test-all requires token', async () => {
  const mod: any = await routeModulePromise;
  const req = makeRequest(TEST_URL);
  const res = await mod.POST(req as MockRequest);
  const payload = await res.json();

  assert.equal(res.status, 401);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'missing_token');
});

test('POST /api/catalog/vendor-sync/registry/test-all enforces scope', async () => {
  const mod: any = await routeModulePromise;
  const token = await createToken('catalog:sync:read');
  const req = makeRequest(TEST_URL, {
    headers: { authorization: `Bearer ${token}` },
  });

  const res = await mod.POST(req as MockRequest);
  const payload = await res.json();

  assert.equal(res.status, 403);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'insufficient_scope');
});

test('POST /api/catalog/vendor-sync/registry/test-all returns aggregated summary', async () => {
  const mod: any = await routeModulePromise;
  const token = await createToken('catalog:sync:write');
  const req = makeRequest(TEST_URL, {
    headers: { authorization: `Bearer ${token}` },
  });

  const res = await mod.POST(req as MockRequest);
  const payload = await res.json();

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.tested, 2); // only vendors with integrations
  assert.equal(payload.passed, 1);
  assert.equal(payload.failed, 1);
  assert.equal(Array.isArray(payload.failures), true);
  assert.equal(payload.failures.length, 1);
  assert.equal(payload.failures[0]?.slug, 'api-only');
  assert.match(String(payload.failures[0]?.error || ''), /not implemented/i);

  // ensure integration snapshots updated in stub
  const integration = prismaStub.__data.vendors
    .find((vendor: VendorRecord) => vendor.slug === 'moscot')
    ?.integration;
  assert.ok(integration?.lastTestOk);
  assert.equal(typeof integration?.lastTestAt, 'object');
});
