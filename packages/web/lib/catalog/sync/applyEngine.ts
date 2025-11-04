import {
  VendorSyncRunStatus,
  type Prisma,
  type VendorCatalogItem,
  type Product,
  type StoreStock,
} from '@prisma/client';

const PendingStatus = (VendorSyncRunStatus as any)?.Pending ?? 'Pending';
const SuccessStatus = (VendorSyncRunStatus as any)?.Success ?? 'Success';
const FailedStatus = (VendorSyncRunStatus as any)?.Failed ?? 'Failed';

import type { NormalizedProduct } from '@/lib/catalog/normalization/types';
import type { PrismaClient } from '@/lib/db';

import { computeDiff, snapshotToProductData, type DiffResult } from './diffEngine';

export type ApplyContext = {
  prisma: PrismaClient;
  vendor: string;
  actor: string;
  sourcePath: string | null;
  normalized: NormalizedProduct[];
  existingCatalogItems: VendorCatalogItem[];
  existingProducts: Array<Product & { stocks: StoreStock[] }>;
  dryRun?: boolean;
};

export type ApplyEngineResult = {
  runId: string;
  diff: DiffResult;
  summary: {
    vendor: string;
    hash: string;
    total: number;
    created: number;
    updated: number;
    unchanged: number;
    removed: number;
    dryRun: boolean;
    durationMs: number;
    finishedAt: string;
    sourcePath: string | null;
  };
};

type Aggregates = {
  counts: DiffResult['counts'];
  hash: string;
  items: Array<{
    catalogId: string;
    status: DiffResult['items'][number]['status'];
    productChanges: Array<{ field: string; before: unknown; after: unknown }>;
    stockChanges: Array<{
      storeId: string;
      before: { qty: number; barcode: string | null };
      after: { qty: number; barcode: string | null };
    }>;
  }>;
  removed: Array<{ catalogId: string; productId: string | null }>;
};

function buildAggregates(diff: DiffResult): Aggregates {
  const items = diff.items.slice(0, 50).map((item) => ({
    catalogId: item.catalogId,
    status: item.status,
    productChanges: item.productChanges.map((change) => ({
      field: change.field,
      before: change.before,
      after: change.after,
    })),
    stockChanges: item.stockChanges
      .filter((change) => change.changed)
      .map((change) => ({
        storeId: change.storeId,
        before: change.before,
        after: change.after,
      })),
  }));

  const removed = diff.removed.map((entry) => ({
    catalogId: entry.catalogId,
    productId: entry.productId,
  }));

  return {
    counts: diff.counts,
    hash: diff.hash,
    items,
    removed,
  };
}

async function applyWrites(
  prisma: PrismaClient,
  diff: DiffResult,
  options: { vendor: string },
): Promise<void> {
  const { vendor } = options;

  // Helper to apply writes when interactive transactions are unavailable
  const runWithoutTransaction = async () => {
    for (const item of diff.items) {
      const productData = snapshotToProductData(item.productAfter);

      if (!item.productBefore) {
        await prisma.product.create({ data: productData });
      } else if (item.productChanges.length > 0) {
        await prisma.product.update({
          where: { id: item.productBefore.id! },
          data: productData,
        });
      }

      const payload = item.normalized as unknown as Prisma.JsonObject;
      if (!item.catalogItemId) {
        await prisma.vendorCatalogItem.create({
          data: {
            vendor,
            catalogId: item.catalogId,
            payload,
            hash: item.hash,
          },
        });
      } else if (item.existingHash !== item.hash) {
        await prisma.vendorCatalogItem.update({
          where: { id: item.catalogItemId },
          data: {
            payload,
            hash: item.hash,
          },
        });
      }

      for (const stock of item.stockChanges) {
        if (!stock.changed) continue;
        await prisma.storeStock.update({
          where: { id: stock.storeStockId },
          data: {
            qty: stock.after.qty,
            barcode: stock.after.barcode,
          },
        });
      }
    }

    for (const removed of diff.removed) {
      for (const stock of removed.stocks) {
        await prisma.storeStock.update({
          where: { id: stock.storeStockId },
          data: {
            qty: 0,
          },
        });
      }
    }
  };

  try {
    await prisma.$transaction(async (tx: any) => {
      for (const item of diff.items) {
        const productData = snapshotToProductData(item.productAfter);

        if (!item.productBefore) {
          await tx.product.create({
            data: productData,
          });
        } else if (item.productChanges.length > 0) {
          await tx.product.update({
            where: { id: item.productBefore.id! },
            data: productData,
          });
        }

        const payload = item.normalized as unknown as Prisma.JsonObject;
        if (!item.catalogItemId) {
          await tx.vendorCatalogItem.create({
            data: {
              vendor,
              catalogId: item.catalogId,
              payload,
              hash: item.hash,
            },
          });
        } else if (item.existingHash !== item.hash) {
          await tx.vendorCatalogItem.update({
            where: { id: item.catalogItemId },
            data: {
              payload,
              hash: item.hash,
            },
          });
        }

        for (const stock of item.stockChanges) {
          if (!stock.changed) continue;
          await tx.storeStock.update({
            where: { id: stock.storeStockId },
            data: {
              qty: stock.after.qty,
              barcode: stock.after.barcode,
            },
          });
        }
      }

      for (const removed of diff.removed) {
        for (const stock of removed.stocks) {
          await tx.storeStock.update({
            where: { id: stock.storeStockId },
            data: {
              qty: 0,
            },
          });
        }
      }
    });
  } catch (err) {
    const message = String((err as any)?.message ?? err);
    // Neon/PgBouncer can drop interactive transactions; fall back to non-transactional writes
    if (message.includes('Transaction not found') || message.includes('Transaction API error')) {
      await runWithoutTransaction();
      return;
    }
    throw err;
  }
}

export async function executeApply(context: ApplyContext): Promise<ApplyEngineResult> {
  const prisma = context.prisma;
  const dryRun = Boolean(context.dryRun);
  const diff = computeDiff({
    vendor: context.vendor,
    normalized: context.normalized,
    existingCatalogItems: context.existingCatalogItems,
    existingProducts: context.existingProducts,
  });

  const counts = diff.counts;
  const startedAt = Date.now();

  const run = await prisma.vendorSyncRun.create({
    data: {
      vendor: context.vendor,
      actor: context.actor,
      status: PendingStatus,
      dryRun,
      sourcePath: context.sourcePath ?? null,
      hash: diff.hash,
      totalItems: counts.total,
      createdCount: counts.created || null,
      updatedCount: counts.updated || null,
      unchangedCount: counts.unchanged || null,
      removedCount: counts.removed || null,
      startedAt: new Date(),
    },
  });

  let applyError: Error | null = null;

  try {
    if (!dryRun) {
      await applyWrites(prisma, diff, { vendor: context.vendor });
    }
  } catch (err) {
    applyError = err instanceof Error ? err : new Error(String(err));
  }

  const durationMs = Date.now() - startedAt;
  const finishedAt = new Date();

  const aggregates = buildAggregates(diff);

  await prisma.vendorSyncRunDiff.upsert({
    where: { runId: run.id },
    update: { aggregates: aggregates as unknown as Prisma.JsonObject },
    create: {
      runId: run.id,
      aggregates: aggregates as unknown as Prisma.JsonObject,
    },
  });

  if (applyError) {
    await prisma.vendorSyncRun.update({
      where: { id: run.id },
      data: {
        status: FailedStatus,
        error: applyError.message,
        durationMs,
        finishedAt,
      },
    });
    throw applyError;
  }

  await prisma.vendorSyncRun.update({
    where: { id: run.id },
    data: {
      status: SuccessStatus,
      error: null,
      durationMs,
      finishedAt,
    },
  });

  if (!dryRun) {
    await prisma.vendorSyncState.upsert({
      where: { vendor: context.vendor },
      update: {
        totalItems: counts.total,
        lastHash: diff.hash,
        lastSource: context.sourcePath ?? null,
        lastRunAt: finishedAt,
        lastRunBy: context.actor,
        lastDurationMs: durationMs,
        lastError: null,
      },
      create: {
        vendor: context.vendor,
        totalItems: counts.total,
        lastHash: diff.hash,
        lastSource: context.sourcePath ?? null,
        lastRunAt: finishedAt,
        lastRunBy: context.actor,
        lastDurationMs: durationMs,
        lastError: null,
      },
    });
  }

  return {
    runId: run.id,
    diff,
    summary: {
      vendor: context.vendor,
      hash: diff.hash,
      total: counts.total,
      created: counts.created,
      updated: counts.updated,
      unchanged: counts.unchanged,
      removed: counts.removed,
      dryRun,
      durationMs,
      finishedAt: finishedAt.toISOString(),
      sourcePath: context.sourcePath ?? null,
    },
  };
}
