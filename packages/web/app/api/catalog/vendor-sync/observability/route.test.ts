import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';

import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

const prismaStub: {
  vendorSyncRun: {
    count: (args: Record<string, unknown>) => Promise<number>;
    findMany: (args: Record<string, unknown>) => Promise<RunRecord[]>;
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

test('vendor sync observability handler', async (t) => {
  t.afterEach(() => {
    prismaStub.vendorSyncRun.count = async () => 0;
    prismaStub.vendorSyncRun.findMany = async () => [];
  });

  await t.test('returns aggregated runs', async () => {
    const runs: RunRecord[] = [
      {
        id: 'run-3',
        vendor: DEFAULT_VENDOR_SLUG,
        status: 'Success',
        actor: 'system',
        dryRun: false,
        sourcePath: '/tmp/catalog-3.json',
        startedAt: new Date('2024-03-03T10:00:00Z'),
        finishedAt: new Date('2024-03-03T10:01:00Z'),
        updatedAt: new Date('2024-03-03T10:01:05Z'),
      },
      {
        id: 'run-2',
        vendor: DEFAULT_VENDOR_SLUG,
        status: 'Pending',
        actor: 'admin',
        dryRun: false,
        sourcePath: '/tmp/catalog-2.json',
        startedAt: new Date('2024-03-02T10:00:00Z'),
        finishedAt: null,
        updatedAt: new Date('2024-03-02T10:01:05Z'),
      },
      {
        id: 'run-1',
        vendor: DEFAULT_VENDOR_SLUG,
        status: 'Failed',
        actor: 'system',
        dryRun: false,
        sourcePath: '/tmp/catalog-1.json',
        startedAt: new Date('2024-03-01T10:00:00Z'),
        finishedAt: new Date('2024-03-01T10:03:00Z'),
        updatedAt: new Date('2024-03-01T10:03:05Z'),
      },
    ];

    const calls: Array<{
      type: 'count' | 'findMany';
      args: Record<string, unknown>;
    }> = [];

    prismaStub.vendorSyncRun.count = async (args) => {
      calls.push({ type: 'count', args });
      return runs.length;
    };
    prismaStub.vendorSyncRun.findMany = async (args) => {
      calls.push({ type: 'findMany', args });
      return runs;
    };

    const mod = await routeModulePromise;
    const req = new MockRequest(
      `https://example.test/api/catalog/vendor-sync/observability?vendorId=${DEFAULT_VENDOR_SLUG}&start=2024-03-01T00:00:00Z&end=2024-03-31T23:59:59Z&limit=2`,
    );
    const res = await mod.GET(req as unknown as NextRequest);
    assert.equal(res.status, 200);
    const payload = await res.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.data.vendorId, DEFAULT_VENDOR_SLUG);
    assert.equal(payload.data.pageSize, 2);
    assert.equal(payload.data.totalRuns, 3);
    assert.equal(payload.data.counts.success, 1);
    assert.equal(payload.data.counts.running, 1);
    assert.equal(payload.data.counts.error, 0);
    assert.equal(payload.data.hasMore, true);
    assert.equal(payload.data.nextCursor, 'run-1');
    assert.equal(payload.data.runs.length, 2);
    assert.equal(payload.data.runs[0].id, 'run-3');
    assert.equal(payload.data.runs[0].status, 'success');
    assert.equal(payload.data.runs[1].status, 'running');
    assert.equal(payload.data.range.start, '2024-03-01T00:00:00.000Z');
    assert.equal(payload.data.range.end, '2024-03-31T23:59:59.000Z');

    assert.equal(calls.length, 2);
    const countArgs = calls[0].args as { where: { vendor: string; startedAt: { gte: Date; lte: Date } } };
    assert.equal(countArgs.where.vendor, DEFAULT_VENDOR_SLUG);
    assert.equal(countArgs.where.startedAt.gte.toISOString(), '2024-03-01T00:00:00.000Z');
    assert.equal(countArgs.where.startedAt.lte.toISOString(), '2024-03-31T23:59:59.000Z');
    const findArgs = calls[1].args as {
      take: number;
      cursor?: { id: string };
      skip?: number;
    };
    assert.equal(findArgs.take, 3);
  });

  await t.test('rejects invalid payloads', async () => {
    const mod = await routeModulePromise;
    const req = new MockRequest(
      'https://example.test/api/catalog/vendor-sync/observability?vendorId=&start=foo&end=2024-03-31T23:59:59Z',
    );
    const res = await mod.GET(req as unknown as NextRequest);
    assert.equal(res.status, 400);
    const payload = await res.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'invalid_request');
  });

  await t.test('propagates errors', async () => {
    prismaStub.vendorSyncRun.count = async () => {
      throw new Error('database down');
    };
    prismaStub.vendorSyncRun.findMany = async () => {
      throw new Error('should not be called');
    };

    const mod = await routeModulePromise;
    const req = new MockRequest(
      `https://example.test/api/catalog/vendor-sync/observability?vendorId=${DEFAULT_VENDOR_SLUG}&start=2024-03-01T00:00:00Z&end=2024-03-31T23:59:59Z`,
    );
    const res = await mod.GET(req as unknown as NextRequest);
    assert.equal(res.status, 500);
    const payload = await res.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'failed_to_load_observability');
  });
});
