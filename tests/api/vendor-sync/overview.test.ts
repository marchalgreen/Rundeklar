import assert from 'node:assert/strict';
import test from 'node:test';

const prismaStub: {
  vendorSyncRun: {
    count: (args: Record<string, any>) => Promise<number>;
    aggregate: (args: Record<string, any>) => Promise<{ _avg: { durationMs: number | null } }>;
    findMany: (args: Record<string, any>) => Promise<any[]>;
  };
} = {
  vendorSyncRun: {
    async count() {
      return 0;
    },
    async aggregate() {
      return { _avg: { durationMs: null } };
    },
    async findMany() {
      return [];
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;
const routeModulePromise = import(
  '../../../packages/web/src/app/api/catalog/vendor-sync/overview/route'
);

test('GET /api/catalog/vendor-sync/overview returns metrics', async () => {
  const counts = { total: 8, success: 5, failed: 2 };
  const countCalls: Array<Record<string, unknown>> = [];
  prismaStub.vendorSyncRun.count = async (args) => {
    countCalls.push(args);
    const status = args?.where?.status ?? null;
    if (status === 'Success') return counts.success;
    if (status === 'Failed') return counts.failed;
    return counts.total;
  };
  prismaStub.vendorSyncRun.aggregate = async () => ({ _avg: { durationMs: 1425 } });
  prismaStub.vendorSyncRun.findMany = async () => [
    {
      id: 'run-pending-1',
      vendor: 'moscot',
      startedAt: new Date('2024-05-01T10:00:00Z'),
      dryRun: true,
    },
    {
      id: 'run-pending-2',
      vendor: 'acme',
      startedAt: new Date('2024-05-01T11:30:00Z'),
      dryRun: false,
    },
  ];

  const mod = await routeModulePromise;
  const res = await mod.GET();

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.metrics.last24h.total, counts.total);
  assert.equal(body.metrics.last24h.success, counts.success);
  assert.equal(body.metrics.last24h.failed, counts.failed);
  assert.equal(body.metrics.last24h.avgDurationMs, 1425);
  assert.equal(body.metrics.inProgress.length, 2);
  assert.equal(body.metrics.inProgress[0].mode, 'preview');
  assert.equal(body.metrics.inProgress[1].mode, 'apply');
  assert.equal(countCalls.length, 3);
});

test('GET /api/catalog/vendor-sync/overview handles errors', async () => {
  prismaStub.vendorSyncRun.count = async () => {
    throw new Error('database down');
  };

  const mod = await routeModulePromise;
  const res = await mod.GET();
  assert.equal(res.status, 500);
  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'failed_to_load_overview');
});
