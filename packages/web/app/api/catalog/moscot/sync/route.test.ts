import assert from 'node:assert/strict';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SignJWT } from 'jose';
import test from 'node:test';
import type { NextRequest } from 'next/server';

const SERVICE_SECRET = new TextEncoder().encode(
  process.env.SERVICE_JWT_SECRET || 'service-dev-secret-change-me',
);

async function createToken(scopes: string | string[]) {
  return new SignJWT({ scopes, sub: 'service-test', aud: 'clairity-services' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(SERVICE_SECRET);
}

async function createCatalogFile(entries: Array<Record<string, unknown>>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'moscot-sync-route-'));
  const fp = path.join(dir, 'catalog.json');
  await writeFile(fp, JSON.stringify(entries, null, 2), 'utf8');
  return fp;
}

class MockRequest {
  url: string;
  headers: Headers;
  method: string;
  private body: unknown;

  constructor(url: string, init: { headers?: Record<string, string>; body?: unknown } = {}) {
    this.url = url;
    this.method = 'POST';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }

  async json(): Promise<unknown> {
    if (this.body === undefined) return {};
    if (typeof this.body === 'string') return JSON.parse(this.body);
    return this.body;
  }
}

type TransactionStub = {
  vendorCatalogItem: {
    create(): Promise<unknown>;
    update(): Promise<unknown>;
    deleteMany(): Promise<{ count: number }>;
  };
  vendorSyncState: {
    upsert(): Promise<unknown>;
  };
};

const prismaStub = {
  vendorCatalogItem: {
    async findMany() {
      return [];
    },
  },
  vendorSyncState: {
    async upsert() {
      return {};
    },
  },
  async $transaction(fn: (tx: TransactionStub) => Promise<unknown>) {
    return fn({
      vendorCatalogItem: {
        async create() {
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
    });
  },
};

(globalThis as any).__PRISMA__ = prismaStub;
const routeModulePromise = import('./route');

test('POST /api/catalog/moscot/sync rejects missing token', async () => {
  const { POST } = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/moscot/sync');
  const res = await POST(req as unknown as NextRequest);
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.error, 'missing_token');
});

test('POST /api/catalog/moscot/sync rejects insufficient scope', async () => {
  const { POST } = await routeModulePromise;
  const token = await createToken('catalog:sync');
  const req = new MockRequest('https://example.test/api/catalog/moscot/sync');
  req.headers.set('authorization', `Bearer ${token}`);

  const res = await POST(req as unknown as NextRequest);
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.error, 'insufficient_scope');
});

test('POST /api/catalog/moscot/sync accepts valid token and propagates dryRun flag', async () => {
  const { POST } = await routeModulePromise;
  const token = await createToken(['catalog:sync', 'catalog:sync:moscot']);
  const catalogPath = await createCatalogFile([{ catalogId: 'ALPHA' }]);
  const req = new MockRequest('https://example.test/api/catalog/moscot/sync?dryRun=0', {
    headers: { authorization: `Bearer ${token}` },
    body: { sourcePath: catalogPath, dryRun: true },
  });

  const res = await POST(req as unknown as NextRequest);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.dryRun, true);
  assert.equal(body.metrics.total, 1);
  assert.equal(body.metrics.created, 1);
  assert.equal(body.metrics.updated, 0);
  assert.equal(body.metrics.removed, 0);
  assert.equal(body.metrics.dryRun, 1);
  assert.equal(body.sourcePath, catalogPath);
});
