import assert from 'node:assert/strict';
import test from 'node:test';

const storeId = 'store-1';

type SampleRow = {
  id: string;
  storeId: string;
  productId: string;
  qty: number;
  barcode: string;
  updatedAt: Date;
  product: {
    id: string;
    sku: string;
    name: string;
    category: string;
    brand: string;
    model: string;
    color: string;
    sizeLabel: string;
    usage: string;
  };
};

const sampleRows: SampleRow[] = [
  {
    id: 'row-1',
    storeId,
    productId: 'prod-1',
    qty: 5,
    barcode: '123',
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    product: {
      id: 'prod-1',
      sku: 'SKU-1',
      name: 'Demo Product',
      category: 'Frames',
      brand: 'Brand',
      model: 'Model',
      color: 'Black',
      sizeLabel: '48',
      usage: 'optical',
    },
  },
];

type StoreStockQuery = {
  where?: unknown;
  include?: { product: boolean };
  take?: number;
};

let capturedArgs: StoreStockQuery | null = null;

const prismaStub = {
  store: {
    async findFirst() {
      return { id: storeId };
    },
  },
  storeStock: {
    async findMany(args: StoreStockQuery) {
      capturedArgs = args;
      return sampleRows;
    },
  },
};

(globalThis as any).__PRISMA__ = prismaStub;
const routeModulePromise = import('./route');

test('GET /api/inventory enforces pagination limit and shapes payload', async () => {
  const { GET } = await routeModulePromise;
  const res = await GET();
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.ok(capturedArgs);
  assert.equal(capturedArgs.take, 800);
  assert.deepEqual(capturedArgs.include, { product: true });
  assert.equal(body.storeId, storeId);
  assert.equal(body.items.length, sampleRows.length);
  assert.deepEqual(body.items[0], {
    id: 'row-1',
    sku: 'SKU-1',
    name: 'Demo Product',
    category: 'Frames',
    qty: 5,
    barcode: '123',
    updatedAt: sampleRows[0].updatedAt.toISOString(),
    brand: 'Brand',
    model: 'Model',
    color: 'Black',
    sizeLabel: '48',
    usage: 'optical',
  });
});
