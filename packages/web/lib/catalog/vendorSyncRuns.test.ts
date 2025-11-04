import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VendorSyncRunSchema,
  VendorSyncRunListResponseSchema,
  VendorSyncRunDetailResponseSchema,
  formatVendorSyncRun,
  makeVendorSyncRunListResponse,
  makeRunListResponse,
  makeRunDetailResponse,
} from '@/lib/catalog/vendorSyncRuns';
import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

// Test-local type (do not depend on Prisma's generated types here)
type TestRun = {
  id: string;
  vendor: string;
  status: 'Pending' | 'Success' | 'Failed';
  actor: string | null;
  dryRun: boolean;
  sourcePath: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  totalItems: number | null;
  createdCount: number | null;
  updatedCount: number | null;
  removedCount: number | null;
  unchangedCount: number | null;
  hash: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  actorId?: string | null;
};

test('formatVendorSyncRun produces schema-compliant payload', () => {
  const metadata: Record<string, unknown> = { timestamp: '2024-01-01T00:00:05.000Z' };
  const run: TestRun = {
    id: 'run_123',
    vendor: DEFAULT_VENDOR_SLUG,
    status: 'Success',
    actor: 'service-bot',
    dryRun: false,
    sourcePath: '/tmp/catalog.json',
    startedAt: new Date('2024-01-01T00:00:00.000Z'),
    finishedAt: new Date('2024-01-01T00:00:05.000Z'),
    durationMs: 5000,
    hash: 'abc123',
    totalItems: 120,
    createdCount: 10,
    updatedCount: 15,
    removedCount: 4,
    unchangedCount: 91,
    error: null,
    metadata,
    createdAt: new Date('2024-01-01T00:00:05.000Z'),
    updatedAt: new Date('2024-01-01T00:00:05.000Z'),
  };

  const formatted = VendorSyncRunSchema.parse(formatVendorSyncRun(run));

  assert.equal(formatted.id, run.id);
  assert.equal(formatted.counts.total, run.totalItems);
  assert.equal(formatted.counts.created, run.createdCount);
  assert.equal(formatted.metadata?.timestamp, metadata.timestamp);
  assert.equal(formatted.durationMs, run.durationMs);
});

test('VendorSyncRunSchema rejects invalid timestamps', () => {
  const result = VendorSyncRunSchema.safeParse({
    id: 'run_invalid',
    vendor: DEFAULT_VENDOR_SLUG,
    status: 'Success',
    actor: 'system',
    dryRun: false,
    sourcePath: null,
    startedAt: 'not-a-date',
    hash: null,
    counts: { totalItems: null, created: null, updated: null, removed: null, unchanged: null },
    error: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(result.success, false);
});

test('VendorSyncRunListResponseSchema validates list payloads', () => {
  const run: TestRun = {
    id: 'run_list',
    vendor: DEFAULT_VENDOR_SLUG,
    status: 'Pending',
    actor: 'system',
    dryRun: true,
    sourcePath: null,
    startedAt: new Date('2024-02-01T00:00:00.000Z'),
    finishedAt: null,
    durationMs: null,
    hash: null,
    totalItems: null,
    createdCount: null,
    updatedCount: null,
    removedCount: null,
    unchangedCount: null,
    error: null,
    metadata: null,
    createdAt: new Date('2024-02-01T00:00:00.000Z'),
    updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  };

  const payload = makeVendorSyncRunListResponse([formatVendorSyncRun(run)], {
    page: 1,
    pageSize: 10,
    totalItems: 1,
    hasMore: false,
  });

  assert.doesNotThrow(() => VendorSyncRunListResponseSchema.parse(payload));
});

test('makeRunListResponse normalizes and wraps runs', () => {
  const run: TestRun = {
    id: 'run_helper',
    vendor: DEFAULT_VENDOR_SLUG,
    status: 'Success',
    actor: 'helper',
    dryRun: false,
    sourcePath: '/tmp/catalog.json',
    startedAt: new Date('2024-03-01T00:00:00.000Z'),
    finishedAt: new Date('2024-03-01T00:05:00.000Z'),
    durationMs: 300000,
    hash: 'hash123',
    totalItems: 42,
    createdCount: 2,
    updatedCount: 3,
    removedCount: 1,
    unchangedCount: 36,
    error: null,
    metadata: null,
    createdAt: new Date('2024-03-01T00:05:00.000Z'),
    updatedAt: new Date('2024-03-01T00:05:00.000Z'),
  };

  const payload = makeRunListResponse([run], { nextCursor: 'cursor_1' });
  const parsed = VendorSyncRunListResponseSchema.parse(payload);

  assert.equal(parsed.data.items.length, 1);
  assert.equal(parsed.data.items[0].id, run.id);
  assert.equal(parsed.data.nextCursor, 'cursor_1');
  assert.equal(parsed.data.page, 1);
  assert.equal(parsed.data.totalItems, 1);
});

test('makeRunDetailResponse normalizes item or null', () => {
  const resp1 = makeRunDetailResponse(null);
  VendorSyncRunDetailResponseSchema.parse(resp1);

  const fakeRun = {
    id: 'run_1',
    vendor: DEFAULT_VENDOR_SLUG,
    status: 'Pending',
    actor: null,
    dryRun: true,
    sourcePath: null,
    startedAt: new Date(),
    finishedAt: null,
    durationMs: null,
    totalItems: 1,
    createdCount: 1,
    updatedCount: 0,
    removedCount: 0,
    unchangedCount: 0,
    hash: null,
    error: null,
    metadata: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  } as any;
  const resp2 = makeRunDetailResponse(fakeRun);
  VendorSyncRunDetailResponseSchema.parse(resp2);
});
