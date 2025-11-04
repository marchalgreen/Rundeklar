import assert from 'node:assert/strict';
import test from 'node:test';

const now = new Date('2024-05-01T12:00:00Z');

const prismaStub: any = {
  vendor: {
    async findMany() {
      return [
        {
          id: 'vendor_moscot',
          slug: 'moscot',
          name: 'MOSCOT',
          createdAt: now,
          updatedAt: now,
          integration: {
            id: 'vendor_moscot_scraper',
            type: 'SCRAPER',
            scraperPath: '/tmp/moscot.catalog.json',
            apiBaseUrl: null,
            apiAuthType: null,
            apiKey: null,
            lastTestAt: new Date('2024-05-01T09:00:00Z'),
            lastTestOk: true,
            meta: { totalItems: 100 },
            createdAt: now,
            updatedAt: now,
          },
        },
      ];
    },
  },
  vendorSyncState: {
    async findMany() {
      return [
        {
          vendor: 'moscot',
          lastRunAt: new Date('2024-05-01T08:30:00Z'),
          totalItems: 100,
          lastError: null,
          lastDurationMs: 4200,
          lastHash: 'hash123',
          lastSource: 'manual',
          lastRunBy: 'system',
          createdAt: now,
          updatedAt: now,
        },
      ];
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;

const routeModulePromise = import('./route');

test('GET /api/catalog/vendor-sync/registry lists vendors', async () => {
  const mod = await routeModulePromise;
  const res = await mod.GET();
  assert.equal(res.status, 200);
  const payload = await res.json();

  assert.equal(payload.ok, true);
  assert.equal(Array.isArray(payload.data), true);
  assert.equal(payload.data.length, 1);
  const [vendor] = payload.data;
  assert.equal(vendor.slug, 'moscot');
  assert.equal(vendor.integration.type, 'SCRAPER');
  assert.equal(vendor.integration.meta.totalItems, 100);
  assert.equal(typeof vendor.integration.lastTestAt, 'string');
  assert.equal(vendor.state?.totalItems, 100);
  assert.equal(vendor.state?.lastError, null);
  assert.equal(typeof vendor.state?.lastRunAt, 'string');
});
