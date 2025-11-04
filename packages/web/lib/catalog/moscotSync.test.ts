// TODO(typing): Mocks using outdated Prisma types; update mock args to current client & remove.
import test from 'node:test';
import assert from 'node:assert/strict';

import type { Prisma, VendorCatalogItem } from '@prisma/client';

type RecordedOperation =
  | { kind: 'create'; catalogId: string }
  | { kind: 'update'; id: string }
  | { kind: 'deleteMany'; catalogIds: string[] }
  | { kind: 'upsert'; hash: string }
  | { kind: 'findMany' };

type TransactionStub = {
  vendorCatalogItem: {
    create(args: Prisma.VendorCatalogItemCreateArgs): Promise<unknown>;
    update(args: Prisma.VendorCatalogItemUpdateArgs): Promise<unknown>;
    deleteMany(args: Prisma.VendorCatalogItemDeleteManyArgs): Promise<unknown>;
  };
  vendorSyncState: {
    upsert(args: Prisma.VendorSyncStateUpsertArgs): Promise<unknown>;
  };
};

type TestClient = {
  vendorCatalogItem: {
    findMany(args: Prisma.VendorCatalogItemFindManyArgs): Promise<VendorCatalogItem[]>;
  };
  vendorSyncState: {
    upsert(args: Prisma.VendorSyncStateUpsertArgs): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: TransactionStub) => Promise<T>): Promise<T>;
};

// ---- test fixture (single MOSCOT product) ----
const ONE_FAKE_MOSCOT: Array<Record<string, unknown>> = [
  {
    catalogId: 'LEMTOSH',
    brand: 'MOSCOT',
    model: 'LEMTOSH',
    name: 'LEMTOSH',
    category: 'Frames',
    variants: [{ id: 'v1', sku: 'LEM-46-TO', sizeLabel: '46', color: { name: 'Tortoise' } }],
    photos: [],
    source: { supplier: 'MOSCOT', confidence: 'manual' as const },
  },
];

let activeClient: TestClient | null = null;

const prismaProxy: TestClient = {
  vendorCatalogItem: {
    async findMany(args: Prisma.VendorCatalogItemFindManyArgs) {
      if (!activeClient) throw new Error('test client not configured');
      return activeClient.vendorCatalogItem.findMany(args);
    },
  },
  vendorSyncState: {
    async upsert(args: Prisma.VendorSyncStateUpsertArgs) {
      if (!activeClient) throw new Error('test client not configured');
      return activeClient.vendorSyncState.upsert(args);
    },
  },
  async $transaction<T>(fn: (tx: TransactionStub) => Promise<T>) {
    if (!activeClient) throw new Error('test client not configured');
    return activeClient.$transaction(fn);
  },
};

const previousPrisma = (globalThis as any).__PRISMA__;
(globalThis as any).__PRISMA__ = prismaProxy;
const modulePromise = import('./moscotSync');

test.after(() => {
  (globalThis as any).__PRISMA__ = previousPrisma;
});

test('syncMoscotCatalog dry-run computes summary without mutating storage', async () => {
  const { syncMoscotCatalog, MOSCOT_VENDOR } = await modulePromise;

  const existing: VendorCatalogItem[] = [
    {
      id: 'existing-lemtosh',
      vendor: MOSCOT_VENDOR,
      catalogId: 'LEMTOSH',
      payload: { catalogId: 'LEMTOSH', name: 'LEMTOSH v0' } as Prisma.JsonObject,
      hash: 'stale-hash',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 'existing-charlie',
      vendor: MOSCOT_VENDOR,
      catalogId: 'CHARLIE',
      payload: { catalogId: 'CHARLIE', name: 'Charlie' } as Prisma.JsonObject,
      hash: 'old-hash',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  ];

  const recorded: RecordedOperation[] = [];
  const client: TestClient = {
    vendorCatalogItem: {
      async findMany() {
        recorded.push({ kind: 'findMany' });
        return existing;
      },
    },
    vendorSyncState: {
      async upsert() {
        recorded.push({ kind: 'upsert', hash: 'should-not-run' });
        throw new Error('upsert should not run in dry-run');
      },
    },
    async $transaction<T>(): Promise<T> {
      throw new Error('transaction should not be invoked for dry-run');
    },
  };

  activeClient = client;
  try {
    const summary = await syncMoscotCatalog({
      inject: ONE_FAKE_MOSCOT,
      sourcePath: 'test-dry-run',
      dryRun: true,
      actor: 'tester',
    });

    assert.equal(summary.dryRun, true);
    assert.equal(summary.total, ONE_FAKE_MOSCOT.length);
    assert.equal(summary.created, 0);
    assert.equal(summary.updated, 1); // LEMTOSH differs from existing hash
    assert.equal(summary.removed, 1); // CHARLIE missing in file
    assert.equal(summary.unchanged, 0);
    assert.equal(summary.vendor, MOSCOT_VENDOR);
    assert.equal(summary.sourcePath, 'test-dry-run');
    assert.equal(summary.durationMs, 0);
    assert.equal(summary.hash.length, 64);
    assert.deepEqual(recorded, [{ kind: 'findMany' }]);
  } finally {
    activeClient = null;
  }
});

test('syncMoscotCatalog apply mode persists catalog changes and tracks operations', async () => {
  const { syncMoscotCatalog, MOSCOT_VENDOR } = await modulePromise;

  const existing: VendorCatalogItem[] = [
    {
      id: 'existing-lemtosh',
      vendor: MOSCOT_VENDOR,
      catalogId: 'LEMTOSH',
      payload: { catalogId: 'LEMTOSH', name: 'LEMTOSH v1' } as Prisma.JsonObject,
      hash: 'stale-hash',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 'existing-charlie',
      vendor: MOSCOT_VENDOR,
      catalogId: 'CHARLIE',
      payload: { catalogId: 'CHARLIE', name: 'Charlie' } as Prisma.JsonObject,
      hash: 'old-hash',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  ];

  const recorded: RecordedOperation[] = [];
  const transactionClient: TransactionStub = {
    vendorCatalogItem: {
      async create(args: Prisma.VendorCatalogItemCreateArgs) {
        recorded.push({ kind: 'create', catalogId: String(args.data.catalogId) });
        return {};
      },
      async update(args: Prisma.VendorCatalogItemUpdateArgs) {
        recorded.push({ kind: 'update', id: String(args.where?.id) });
        return {};
      },
      async deleteMany(args: Prisma.VendorCatalogItemDeleteManyArgs) {
        const filter = args.where?.catalogId;
        const ids = Array.isArray(filter)
          ? filter
          : filter &&
            typeof filter === 'object' &&
            'in' in filter &&
            Array.isArray((filter as { in?: unknown }).in)
          ? ((filter as { in?: unknown }).in as string[])
          : [];
        recorded.push({ kind: 'deleteMany', catalogIds: ids });
        return { count: ids.length };
      },
    },
    vendorSyncState: {
      async upsert(args: Prisma.VendorSyncStateUpsertArgs) {
        const hash = String(args.update?.lastHash ?? args.create?.lastHash ?? '');
        recorded.push({ kind: 'upsert', hash });
        return {};
      },
    },
  };

  const client: TestClient = {
    vendorCatalogItem: {
      async findMany() {
        recorded.push({ kind: 'findMany' });
        return existing;
      },
    },
    vendorSyncState: {
      async upsert() {
        recorded.push({ kind: 'upsert', hash: 'should-use-transaction' });
        throw new Error('upsert should occur within transaction');
      },
    },
    async $transaction<T>(fn: (tx: typeof transactionClient) => Promise<T>): Promise<T> {
      return fn(transactionClient);
    },
  };

  activeClient = client;
  try {
    const summary = await syncMoscotCatalog({
      inject: ONE_FAKE_MOSCOT,
      sourcePath: 'test-apply',
      dryRun: false,
      actor: 'tester',
    });

    assert.equal(summary.dryRun, false);
    assert.equal(summary.total, ONE_FAKE_MOSCOT.length);
    assert.equal(summary.created, 0);
    assert.equal(summary.updated, 1);
    assert.equal(summary.removed, 1);
    assert.equal(summary.unchanged, 0);
    assert.equal(summary.vendor, MOSCOT_VENDOR);
    assert.equal(summary.sourcePath, 'test-apply');
    assert.ok(summary.durationMs >= 0);
    assert.equal(summary.hash.length, 64);

    assert.deepEqual(recorded, [
      { kind: 'findMany' },
      { kind: 'update', id: 'existing-lemtosh' },
      { kind: 'deleteMany', catalogIds: ['CHARLIE'] },
      { kind: 'upsert', hash: summary.hash },
    ]);
  } finally {
    activeClient = null;
  }
});
