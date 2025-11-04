import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';

import { MoscotRawSample } from '../../mocks/catalogSamples';

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

type TransactionCapture = {
  productCreates: unknown[];
  productUpdates: unknown[];
  vendorCatalogCreates: unknown[];
  vendorCatalogUpdates: unknown[];
  storeStockUpdates: unknown[];
};

function createSharedPrismaStub() {
  const runCreates: unknown[] = [];
  const runUpdates: unknown[] = [];
  const diffUpserts: unknown[] = [];
  const stateUpserts: unknown[] = [];
  const transaction: TransactionCapture = {
    productCreates: [],
    productUpdates: [],
    vendorCatalogCreates: [],
    vendorCatalogUpdates: [],
    storeStockUpdates: [],
  };
  const data = {
    catalogItems: [] as any[],
    products: [] as any[],
  };
  let delegate: any = null;

  const stub: any = {
    vendor: {
      async findMany(...args: unknown[]) {
        if (delegate?.vendor?.findMany) return delegate.vendor.findMany(...args);
        return [];
      },
      async findUnique(...args: unknown[]) {
        if (delegate?.vendor?.findUnique) return delegate.vendor.findUnique(...args);
        return null;
      },
    },
    vendorCatalogItem: {
      async findMany(...args: unknown[]) {
        if (delegate?.vendorCatalogItem?.findMany)
          return delegate.vendorCatalogItem.findMany(...args);
        return data.catalogItems;
      },
      async create(args: unknown) {
        if (delegate?.vendorCatalogItem?.create) return delegate.vendorCatalogItem.create(args);
        transaction.vendorCatalogCreates.push(args);
        return {};
      },
      async update(args: unknown) {
        if (delegate?.vendorCatalogItem?.update) return delegate.vendorCatalogItem.update(args);
        transaction.vendorCatalogUpdates.push(args);
        return {};
      },
    },
    product: {
      async findMany(...args: unknown[]) {
        if (delegate?.product?.findMany) return delegate.product.findMany(...args);
        return data.products;
      },
      async create(args: unknown) {
        if (delegate?.product?.create) return delegate.product.create(args);
        transaction.productCreates.push(args);
        return { id: 'product-new' };
      },
      async update(args: unknown) {
        if (delegate?.product?.update) return delegate.product.update(args);
        transaction.productUpdates.push(args);
        return {};
      },
    },
    storeStock: {
      async update(args: unknown) {
        if (delegate?.storeStock?.update) return delegate.storeStock.update(args);
        transaction.storeStockUpdates.push(args);
        return {};
      },
    },
    vendorSyncRun: {
      async create(args: unknown) {
        if (delegate?.vendorSyncRun?.create) return delegate.vendorSyncRun.create(args);
        runCreates.push(args);
        return { id: 'run-stub' };
      },
      async update(args: unknown) {
        if (delegate?.vendorSyncRun?.update) return delegate.vendorSyncRun.update(args);
        runUpdates.push(args);
        return {};
      },
    },
    vendorSyncRunDiff: {
      async upsert(args: unknown) {
        if (delegate?.vendorSyncRunDiff?.upsert) return delegate.vendorSyncRunDiff.upsert(args);
        diffUpserts.push(args);
        return {};
      },
    },
    vendorSyncState: {
      async upsert(args: unknown) {
        if (delegate?.vendorSyncState?.upsert) return delegate.vendorSyncState.upsert(args);
        stateUpserts.push(args);
        return {};
      },
      async update(...args: unknown[]) {
        if (delegate?.vendorSyncState?.update) return delegate.vendorSyncState.update(...args);
        return {};
      },
    },
    vendorIntegration: {
      async update(args: unknown) {
        if (delegate?.vendorIntegration?.update) {
          return delegate.vendorIntegration.update(args);
        }
        return {};
      },
    },
    async $transaction(fn: (tx: typeof stub) => Promise<unknown>) {
      if (delegate?.$transaction) return delegate.$transaction(fn);
      return fn({
        product: stub.product,
        vendorCatalogItem: stub.vendorCatalogItem,
        storeStock: stub.storeStock,
      } as any);
    },
    __calls: { runCreates, runUpdates, diffUpserts, stateUpserts, transaction },
    reset(options: { catalogItems?: any[]; products?: any[] } = {}) {
      data.catalogItems = options.catalogItems ?? [];
      data.products = options.products ?? [];
      runCreates.length = 0;
      runUpdates.length = 0;
      diffUpserts.length = 0;
      stateUpserts.length = 0;
      transaction.productCreates.length = 0;
      transaction.productUpdates.length = 0;
      transaction.vendorCatalogCreates.length = 0;
      transaction.vendorCatalogUpdates.length = 0;
      transaction.storeStockUpdates.length = 0;
    },
    setDelegate(value: unknown) {
      if (!value || value === stub) {
        delegate = null;
        return;
      }
      delegate = value;
    },
  };

  return stub;
}

const prismaStub = createSharedPrismaStub();
const hadPreviousPrisma = Object.prototype.hasOwnProperty.call(globalThis, '__PRISMA__');
const existingPrisma = (globalThis as any).__PRISMA__;
if (existingPrisma && existingPrisma !== prismaStub) {
  prismaStub.setDelegate(existingPrisma);
}
Object.defineProperty(globalThis, '__PRISMA__', {
  get() {
    return prismaStub;
  },
  set(value: unknown) {
    prismaStub.setDelegate(value);
  },
  configurable: true,
});

test.after(() => {
  delete (globalThis as any).__PRISMA__;
  if (hadPreviousPrisma) {
    (globalThis as any).__PRISMA__ = existingPrisma;
  }
});

test('POST /api/catalog/vendor-sync/:slug/preview returns diff summary', async () => {
  prismaStub.reset({ catalogItems: [], products: [] });

  const mod = await import('../../../packages/web/src/app/api/catalog/vendor-sync/[slug]/preview/route');
  const token = await createToken('catalog:sync:write');
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/moscot/preview', {
    headers: { authorization: `Bearer ${token}` },
    body: { items: [MoscotRawSample] },
  });

  const res = await mod.POST(req as any, { params: { slug: 'moscot' } });
  const payload = await res.json();

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, 'preview');
  assert.equal(payload.diff.counts.created, 1);
  assert.equal(payload.diff.counts.updated, 0);
  assert.equal(prismaStub.__calls.runCreates.length, 1);
  assert.equal(prismaStub.__calls.diffUpserts.length, 1);
});

test('POST /api/catalog/vendor-sync/:slug/apply updates products and stocks', async () => {
  prismaStub.reset({
    catalogItems: [
      {
        id: 'catalog-existing',
        vendor: 'moscot',
        catalogId: 'LEMTOSH-BLACK',
        hash: 'old-hash',
        payload: {},
      },
    ],
    products: [
      {
        id: 'product-existing',
        sku: 'moscot:LEMTOSH-BLACK',
        name: 'LEMTOSH OLD',
        category: 'Frames',
        brand: 'MOSCOT',
        model: 'LEMTOSH',
        color: 'Black',
        sizeLabel: '46-24-145',
        usage: 'optical',
        catalogUrl: null,
        supplier: 'MOSCOT',
        stocks: [
          {
            id: 'stock-existing',
            storeId: 'store-1',
            productId: 'product-existing',
            qty: 5,
            barcode: 'OLD-UPC',
          },
        ],
      },
    ],
  });

  const mod = await import('../../../packages/web/src/app/api/catalog/vendor-sync/[slug]/apply/route');
  const token = await createToken('catalog:sync:write');
  const req = new MockRequest('https://example.test/api/catalog/vendor-sync/moscot/apply', {
    headers: { authorization: `Bearer ${token}` },
    body: { items: [MoscotRawSample] },
  });

  const res = await mod.POST(req as any, { params: { slug: 'moscot' } });
  const payload = await res.json();

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, 'apply');
  assert.equal(payload.diff.counts.updated >= 1, true);

  const { transaction, runCreates, stateUpserts } = prismaStub.__calls;

  assert.equal(runCreates.length, 1);
  assert.equal(stateUpserts.length, 1);
  assert.equal(transaction.productUpdates.length >= 1, true);
  assert.equal(transaction.vendorCatalogUpdates.length >= 1, true);
  assert.equal(transaction.storeStockUpdates.length, 1);

  const stockUpdate = transaction.storeStockUpdates[0] as {
    data: { qty: number; barcode: string | null };
  };
  assert.equal(stockUpdate.data.qty, (MoscotRawSample.variants as readonly unknown[]).length);
});
