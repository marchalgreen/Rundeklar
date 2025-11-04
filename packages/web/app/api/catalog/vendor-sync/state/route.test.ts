import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';

import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

type FindStateArgs = { where: { vendor: string } };

const prismaStub: {
  vendorSyncState: {
    findUnique: (args: FindStateArgs) => Promise<null | {
      vendor: string;
      totalItems: number;
      lastRunAt: Date | null;
      lastDurationMs: number | null;
      lastSource: string | null;
      lastHash: string | null;
      lastRunBy: string | null;
      lastError: string | null;
      updatedAt: Date;
      createdAt: Date;
    }>;
  };
} = {
  vendorSyncState: {
    async findUnique() {
      return null;
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;
const routeModulePromise = import('./route');

class MockRequest {
  url: string;
  method: string;
  headers: Headers;

  constructor(url: string) {
    this.url = url;
    this.method = 'GET';
    this.headers = new Headers();
  }
}

test('GET /api/catalog/vendor-sync/state returns snapshot when present', async () => {
  prismaStub.vendorSyncState.findUnique = async (args: FindStateArgs) => {
    assert.equal(args.where.vendor, DEFAULT_VENDOR_SLUG);
    return {
      vendor: DEFAULT_VENDOR_SLUG,
      totalItems: 42,
      lastRunAt: new Date('2024-03-02T12:00:00Z'),
      lastDurationMs: 1234,
      lastSource: '/tmp/catalog.json',
      lastHash: 'abc123',
      lastRunBy: 'system',
      lastError: null,
      updatedAt: new Date('2024-03-02T12:00:10Z'),
      createdAt: new Date('2024-02-01T09:00:00Z'),
    };
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/state');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 200);
  const payload = await res.json();

  assert.equal(payload.ok, true);
  assert.equal(payload.snapshot.vendor, DEFAULT_VENDOR_SLUG);
  assert.equal(payload.snapshot.totalItems, 42);
  assert.equal(payload.snapshot.lastHash, 'abc123');
  assert.equal(payload.snapshot.lastError, null);
  assert.equal(typeof payload.snapshot.lastRunAt, 'string');
  assert.ok(payload.snapshot.lastRunAt.endsWith('Z'));
});

test('GET /api/catalog/vendor-sync/state returns null snapshot when missing', async () => {
  prismaStub.vendorSyncState.findUnique = async () => {
    return null;
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/state?vendor=ALPHA');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 200);
  const payload = await res.json();

  assert.equal(payload.ok, true);
  assert.equal(payload.snapshot, null);
});

test('GET /api/catalog/vendor-sync/state rejects empty vendor', async () => {
  prismaStub.vendorSyncState.findUnique = async () => {
    throw new Error('should not be called');
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/state?vendor=');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 400);
  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'missing_vendor');
});
