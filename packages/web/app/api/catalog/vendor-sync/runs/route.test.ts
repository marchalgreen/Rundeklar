import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';

import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

type CountArgs = { where: { vendor: string } };
type FindArgs = Record<string, unknown>;

const prismaStub: {
  vendorSyncRun: {
    count: (args: CountArgs) => Promise<number>;
    findMany: (args: FindArgs) => Promise<RunRecord[]>;
  };
} = {
  vendorSyncRun: {
    async count() {
      return 0;
    },
    async findMany() {
      return [];
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;
const routeModulePromise = import('./route');

type RunRecord = {
  id: string;
  vendor: string;
  status: 'Pending' | 'Success' | 'Failed';
  actor: string | null;
  dryRun: boolean;
  sourcePath: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  updatedAt: Date;
};

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

test('GET /api/catalog/vendor-sync/runs returns paginated runs', async () => {
  const runs: RunRecord[] = [
    {
      id: 'run-2',
      vendor: DEFAULT_VENDOR_SLUG,
      status: 'Success',
      actor: 'system',
      dryRun: false,
      sourcePath: '/tmp/catalog-2.json',
      startedAt: new Date('2024-03-02T10:00:00Z'),
      finishedAt: new Date('2024-03-02T10:01:00Z'),
      updatedAt: new Date('2024-03-02T10:01:05Z'),
    },
    {
      id: 'run-1',
      vendor: DEFAULT_VENDOR_SLUG,
      status: 'Pending',
      actor: 'admin',
      dryRun: true,
      sourcePath: '/tmp/catalog-1.json',
      startedAt: new Date('2024-03-01T08:30:00Z'),
      finishedAt: null,
      updatedAt: new Date('2024-03-01T08:45:00Z'),
    },
  ];

  const calls: Array<{ type: 'count'; args: CountArgs } | { type: 'findMany'; args: FindArgs }>
    = [];
  prismaStub.vendorSyncRun.count = async (args: CountArgs) => {
    calls.push({ type: 'count', args });
    return runs.length;
  };
  prismaStub.vendorSyncRun.findMany = async (args: FindArgs) => {
    calls.push({ type: 'findMany', args });
    return runs;
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/runs?limit=1');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 200);
  const payload = await res.json();

  assert.equal(payload.ok, true);
  assert.equal(payload.data.pageSize, 1);
  assert.equal(payload.data.items.length, 1);
  assert.equal(payload.data.hasMore, true);
  assert.equal(payload.data.nextCursor, 'run-1');
  assert.equal(payload.data.items[0].status, 'success');
  assert.equal(payload.data.items[0].vendor, DEFAULT_VENDOR_SLUG);
  assert.equal(payload.data.items[0].hash, null);

  assert.equal(calls.length, 2);
  const firstCall = calls[0];
  assert.equal(firstCall.type, 'count');
  assert.deepEqual(firstCall.args, { where: { vendor: DEFAULT_VENDOR_SLUG } });
  const secondCall = calls[1];
  assert.equal(secondCall.type, 'findMany');
  assert.equal((secondCall.args as { take?: number }).take, 2);
});

test('GET /api/catalog/vendor-sync/runs rejects empty vendor', async () => {
  prismaStub.vendorSyncRun.count = async () => {
    throw new Error('should not be called');
  };
  prismaStub.vendorSyncRun.findMany = async () => {
    throw new Error('should not be called');
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/runs?vendor=');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 400);
  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'missing_vendor');
});
