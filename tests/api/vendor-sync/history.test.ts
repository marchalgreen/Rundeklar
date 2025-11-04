import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';

const prismaStub: {
  vendorSyncRun: {
    findMany: (args: Record<string, any>) => Promise<any[]>;
  };
} = {
  vendorSyncRun: {
    async findMany() {
      return [];
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;
const routeModulePromise = import(
  '../../../packages/web/src/app/api/catalog/vendor-sync/history/route'
);

class MockRequest {
  url: string;
  method = 'GET';
  headers = new Headers();

  constructor(url: string) {
    this.url = url;
  }
}

test('GET /api/catalog/vendor-sync/history groups runs per vendor', async () => {
  const runsByVendor: Record<string, any[]> = {
    moscot: [
      {
        id: 'run-1',
        vendor: 'moscot',
        status: 'Success',
        actor: 'system',
        dryRun: false,
        startedAt: new Date('2024-04-01T10:00:00Z'),
        finishedAt: new Date('2024-04-01T10:05:00Z'),
        updatedAt: new Date('2024-04-01T10:05:00Z'),
        durationMs: 300000,
        totalItems: 120,
      },
      {
        id: 'run-2',
        vendor: 'moscot',
        status: 'Failed',
        actor: 'system',
        dryRun: false,
        startedAt: new Date('2024-03-28T09:00:00Z'),
        finishedAt: new Date('2024-03-28T09:02:00Z'),
        updatedAt: new Date('2024-03-28T09:02:00Z'),
        durationMs: 120000,
        totalItems: 80,
      },
    ],
    acme: [
      {
        id: 'run-3',
        vendor: 'acme',
        status: 'Pending',
        actor: 'qa',
        dryRun: true,
        startedAt: new Date('2024-04-02T08:00:00Z'),
        finishedAt: null,
        updatedAt: new Date('2024-04-02T08:00:00Z'),
        durationMs: null,
        totalItems: null,
      },
    ],
  };
  prismaStub.vendorSyncRun.findMany = async (args) => {
    if (Array.isArray(args?.distinct)) {
      return Object.keys(runsByVendor)
        .sort((a, b) => a.localeCompare(b))
        .map((vendor) => ({ vendor }));
    }
    const vendor = args?.where?.vendor as string;
    return runsByVendor[vendor] ?? [];
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/history?limit=5');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.vendors.length, 2);
  assert.equal(payload.vendors[0].vendor, 'acme');
  assert.equal(payload.vendors[1].runs.length, 2);
  assert.equal(payload.vendors[1].runs[0].status, 'success');
});

test('GET /api/catalog/vendor-sync/history handles failures', async () => {
  prismaStub.vendorSyncRun.findMany = async () => {
    throw new Error('failed to fetch');
  };

  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/history');
  const res = await mod.GET(req as unknown as NextRequest);
  assert.equal(res.status, 500);
  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'failed_to_load_history');
});
