import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';

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
    this.body = init.body ?? {};
  }

  async json(): Promise<unknown> {
    return this.body;
  }
}

type VendorRecord = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

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

type PrismaStub = {
  vendor: {
    findUnique: (args: {
      where: { slug?: string; id?: string };
      include?: { integration?: boolean };
    }) => Promise<(VendorRecord & { integration?: IntegrationRecord | null }) | VendorRecord | null>;
    create: (args: { data: { slug: string; name: string } }) => Promise<VendorRecord>;
  };
  vendorIntegration: {
    create: (args: {
      data: {
        vendorId: string;
        type: 'SCRAPER' | 'API';
        scraperPath?: string | null;
        apiBaseUrl?: string | null;
        apiAuthType?: string | null;
        apiKey?: string | null;
      };
    }) => Promise<IntegrationRecord>;
  };
  $transaction: <T>(
    fn: (tx: { vendor: PrismaStub['vendor']; vendorIntegration: PrismaStub['vendorIntegration'] }) => Promise<T>,
  ) => Promise<T>;
  reset: () => void;
  __data: { vendors: VendorRecord[]; integrations: IntegrationRecord[] };
};

function createPrismaStub(): PrismaStub {
  const data = {
    vendors: [] as VendorRecord[],
    integrations: [] as IntegrationRecord[],
  };

  const stub: PrismaStub = {
    vendor: {
      async findUnique(args) {
        const { slug, id } = args.where;
        const match = data.vendors.find(
          (vendor) => (slug && vendor.slug === slug) || (id && vendor.id === id),
        );
        if (!match) return null;
        if (!args.include?.integration) return match;
        const integration = data.integrations.find((item) => item.vendorId === match.id) ?? null;
        return { ...match, integration };
      },
      async create(args) {
        const now = new Date();
        const vendor: VendorRecord = {
          id: `vendor-${data.vendors.length + 1}`,
          slug: args.data.slug,
          name: args.data.name,
          createdAt: now,
          updatedAt: now,
        };
        data.vendors.push(vendor);
        return vendor;
      },
    },
    vendorIntegration: {
      async create(args) {
        const now = new Date();
        const integration: IntegrationRecord = {
          id: `integration-${data.integrations.length + 1}`,
          vendorId: args.data.vendorId,
          type: args.data.type,
          scraperPath: args.data.scraperPath ?? null,
          apiBaseUrl: args.data.apiBaseUrl ?? null,
          apiAuthType: args.data.apiAuthType ?? null,
          apiKey: args.data.apiKey ?? null,
          lastTestAt: null,
          lastTestOk: null,
          meta: null,
          createdAt: now,
          updatedAt: now,
        };
        data.integrations.push(integration);
        return integration;
      },
    },
    async $transaction(fn) {
      return fn({ vendor: stub.vendor, vendorIntegration: stub.vendorIntegration });
    },
    reset() {
      data.vendors = [];
      data.integrations = [];
    },
    __data: data,
  };

  return stub;
}

const prismaStub = createPrismaStub();
const hadExistingPrisma = Object.prototype.hasOwnProperty.call(globalThis, '__PRISMA__');
const previousPrisma = (globalThis as any).__PRISMA__;
(globalThis as any).__PRISMA__ = prismaStub;

test.after(() => {
  if (hadExistingPrisma) {
    (globalThis as any).__PRISMA__ = previousPrisma;
  } else {
    delete (globalThis as any).__PRISMA__;
  }
});

test('POST /api/catalog/vendor-sync/vendors creates a vendor', async () => {
  prismaStub.reset();

  const mod = await import('../../../packages/web/src/app/api/catalog/vendor-sync/vendors/route');
  const token = await createToken('catalog:sync:write');
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/vendors', {
    headers: { authorization: `Bearer ${token}` },
    body: {
      slug: 'wizard-acme',
      name: 'Wizard Acme',
      integrationType: 'SCRAPER',
      credentials: { scraperPath: '/tmp/wizard-acme.json' },
    },
  });

  const res = await mod.POST(req as unknown as Request);
  const payload = await res.json();

  assert.equal(res.status, 201);
  assert.equal(payload.ok, true);
  assert.equal(payload.vendor.slug, 'wizard-acme');
  assert.equal(prismaStub.__data.vendors.length, 1);
  assert.equal(prismaStub.__data.integrations.length, 1);
  assert.equal(prismaStub.__data.integrations[0]?.scraperPath, '/tmp/wizard-acme.json');
});
