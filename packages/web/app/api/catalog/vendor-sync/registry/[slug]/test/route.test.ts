import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { NextRequest } from 'next/server';

const tmpRoot = mkdtempSync(join(tmpdir(), 'vendor-registry-test-'));
const sampleFile = join(tmpRoot, 'catalog.json');
writeFileSync(sampleFile, JSON.stringify([{ catalogId: 'item-1' }]));

const updateCalls: any[] = [];

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
        integration: {
          id: 'vendor_moscot_scraper',
          vendorId: 'vendor_moscot',
          type: 'SCRAPER',
          scraperPath: sampleFile,
          apiBaseUrl: null,
          apiAuthType: null,
          apiKey: null,
          lastTestAt: null,
          lastTestOk: null,
          meta: null,
          createdAt: new Date('2024-05-01T12:00:00Z'),
          updatedAt: new Date('2024-05-01T12:00:00Z'),
        },
      };
    },
  },
  vendorIntegration: {
    async update(args: any) {
      updateCalls.push(args);
      return args;
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;

const routeModulePromise = import('./route');

class MockRequest {
  url: string;
  method = 'POST';
  headers = new Headers();
  private body: string;
  constructor(url: string, body: Record<string, unknown>) {
    this.url = url;
    this.body = JSON.stringify(body);
  }
  async json() {
    return JSON.parse(this.body);
  }
}

test('POST /api/catalog/vendor-sync/registry/:slug/test runs connection test', async () => {
  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/registry/moscot/test', {});
  const res = await mod.POST(req as unknown as NextRequest, { params: Promise.resolve({ slug: 'moscot' }) });
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.data.vendor, 'moscot');
  assert.equal(payload.data.meta.totalItems, 1);
  assert.equal(updateCalls.length > 0, true);
  const update = updateCalls.pop();
  assert.equal(update.where.id, 'vendor_moscot_scraper');
  assert.equal(update.data.lastTestOk, true);
});

test('POST /api/catalog/vendor-sync/registry/:slug/test handles invalid vendor', async () => {
  const mod = await routeModulePromise;
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/registry/unknown/test', {});
  const res = await mod.POST(req as unknown as NextRequest, { params: Promise.resolve({ slug: 'unknown' }) });
  assert.equal(res.status, 400);
  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'invalid_vendor');
});

test.after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});
