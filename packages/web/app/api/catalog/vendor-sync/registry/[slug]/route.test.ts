import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';

const prismaStub: any = {
  vendor: {
    async findUnique(args: { where: { slug: string } }) {
      if (args.where.slug !== 'moscot') return null;
      return {
        id: 'vendor_moscot',
        slug: 'moscot',
        name: 'MOSCOT',
        createdAt: new Date('2024-05-01T12:00:00Z'),
        updatedAt: new Date('2024-05-01T12:00:00Z'),
        integration: null,
      };
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;

const routeModulePromise = import('./route');

class MockRequest {
  url: string;
  method = 'GET';
  headers = new Headers();
  constructor(url: string) {
    this.url = url;
  }
}

test('GET /api/catalog/vendor-sync/registry/:slug returns vendor', async () => {
  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/registry/moscot');
  const res = await mod.GET(req as unknown as NextRequest, { params: Promise.resolve({ slug: 'moscot' }) });
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.data.slug, 'moscot');
});

test('GET /api/catalog/vendor-sync/registry/:slug handles missing vendor', async () => {
  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/registry/unknown');
  const res = await mod.GET(req as unknown as NextRequest, { params: Promise.resolve({ slug: 'unknown' }) });
  assert.equal(res.status, 404);
  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'not_found');
});
