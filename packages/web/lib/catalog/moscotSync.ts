// src/lib/catalog/moscotSync.ts
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { Prisma, VendorCatalogItem } from '@prisma/client';
import { VendorSyncRunStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { DEFAULT_VENDOR_SLUG } from './vendorSlugs';
import type { CatalogProduct } from '@/types/product';

export const MOSCOT_VENDOR = DEFAULT_VENDOR_SLUG;
const DEV_DEFAULT_PATH = '/tmp/moscot.catalog.json';

/* ==============================
   Types & Schemas
   ============================== */

const CatalogProductSchema = z.object({ catalogId: z.string().min(1) }).passthrough();
const CatalogArraySchema = z.array(CatalogProductSchema);

export type LoadCatalogOptions = {
  explicitPath?: string | null;
};

export type LoadCatalogResult = {
  products: CatalogProduct[];
  sourcePath: string;
};

export type SyncCatalogOptions = {
  sourcePath?: string;
  dryRun?: boolean;
  actor?: string;
  /** Test-only hook: provide catalog rows directly instead of reading from disk */
  inject?: Array<Record<string, unknown>>;
};

export type SyncCatalogSummary = {
  vendor: string;
  sourcePath: string;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  hash: string;
  dryRun: boolean;
  durationMs: number;
  timestamp: string;
  /** present when run-history is enabled */
  runId?: string;
  /** present when run-history is enabled */
  status?: 'Pending' | 'Success' | 'Failed';
};

/* ==============================
   Utility
   ============================== */

function candidatePaths(explicit?: string | null): string[] {
  const list: string[] = [];
  const push = (p?: string | null) => {
    if (!p) return;
    const resolved = path.resolve(p);
    if (!list.includes(resolved)) list.push(resolved);
  };

  push(explicit || undefined);
  push(process.env.CATALOG_MOSCOT_PATH || undefined);

  if (process.env.NODE_ENV !== 'production') {
    push(DEV_DEFAULT_PATH);
  }

  push(path.join(process.cwd(), 'public', 'demo', 'moscot.catalog.json'));
  return list;
}

async function readCatalogFile(fp: string): Promise<CatalogProduct[]> {
  const buf = await fs.readFile(fp, 'utf8');
  const raw = JSON.parse(buf);
  const parsed = CatalogArraySchema.parse(raw);
  return parsed as CatalogProduct[];
}

export async function loadMoscotCatalog(
  options: LoadCatalogOptions = {},
): Promise<LoadCatalogResult> {
  const attempts = candidatePaths(options.explicitPath);
  const tried: string[] = [];
  let lastError: unknown;

  for (const candidate of attempts) {
    tried.push(candidate);
    try {
      const products = await readCatalogFile(candidate);
      return { products, sourcePath: candidate };
    } catch (err) {
      lastError = err;
    }
  }

  const detail = lastError instanceof Error ? `: ${lastError.message}` : '';
  throw new Error(`Unable to read MOSCOT catalog from paths ${tried.join(', ')}${detail}`);
}

function hashPayload(value: CatalogProduct): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function aggregateHash(entries: Array<{ catalogId: string; hash: string }>): string {
  const hash = createHash('sha256');
  const sorted = [...entries].sort((a, b) => a.catalogId.localeCompare(b.catalogId));
  for (const entry of sorted) {
    hash.update(entry.catalogId);
    hash.update(':');
    hash.update(entry.hash);
    hash.update('|');
  }
  return hash.digest('hex');
}

/* ==============================
   Sync (with run-history; batched writes)
   ============================== */

export async function syncMoscotCatalog(
  options: SyncCatalogOptions = {},
): Promise<SyncCatalogSummary> {
  const actor = options.actor || 'service';

  // Resolve catalog rows
  const useInjectedRows = Array.isArray(options.inject);
  const { products, sourcePath } = useInjectedRows
    ? {
        products: CatalogArraySchema.parse(options.inject ?? []) as CatalogProduct[],
        sourcePath: options.sourcePath ?? '(injected)',
      }
    : await loadMoscotCatalog({ explicitPath: options.sourcePath });

  // Build hashes and payload map
  const payloads = new Map<
    string,
    {
      payload: Prisma.JsonObject;
      hash: string;
    }
  >();

  for (const product of products) {
    const hash = hashPayload(product);
    payloads.set(product.catalogId, {
      payload: product as unknown as Prisma.JsonObject,
      hash,
    });
  }

  const client = await prisma;

  // Diff against existing
  const existingList = (await client.vendorCatalogItem.findMany({
    where: { vendor: MOSCOT_VENDOR },
  })) as VendorCatalogItem[];
  const existingMap = new Map<string, VendorCatalogItem>(
    existingList.map((item) => [item.catalogId, item]),
  );

  const toCreate: Array<{ catalogId: string; payload: Prisma.JsonObject; hash: string }> = [];
  const toUpdate: Array<{
    id: string;
    catalogId: string;
    payload: Prisma.JsonObject;
    hash: string;
  }> = [];
  const toRemove: string[] = [];
  let unchanged = 0;

  for (const [catalogId, data] of payloads.entries()) {
    const match = existingMap.get(catalogId);
    if (!match) {
      toCreate.push({ catalogId, payload: data.payload, hash: data.hash });
      continue;
    }

    if (match.hash !== data.hash) {
      toUpdate.push({ id: match.id, catalogId, payload: data.payload, hash: data.hash });
    } else {
      unchanged += 1;
    }
  }

  for (const [catalogId] of existingMap) {
    if (!payloads.has(catalogId)) {
      toRemove.push(catalogId);
    }
  }

  const summaryEntries = Array.from(payloads.entries()).map(([catalogId, entry]) => ({
    catalogId,
    hash: entry.hash,
  }));
  const aggregate = aggregateHash(summaryEntries);

  // Open run-history row
  let runId: string | undefined;
  try {
    const created = await (client as any).vendorSyncRun?.create?.({ // eslint-disable-line @typescript-eslint/no-explicit-any
      data: {
        vendor: MOSCOT_VENDOR,
        actor,
        status: VendorSyncRunStatus.Pending,
        dryRun: Boolean(options.dryRun),
        sourcePath,
        hash: aggregate,
        totalItems: payloads.size,
        createdCount: toCreate.length || null,
        updatedCount: toUpdate.length || null,
        unchangedCount: unchanged || null,
        removedCount: toRemove.length || null,
        startedAt: new Date(),
      },
      select: { id: true },
    });
    runId = created?.id;
  } catch {
    // ignore in tests
  }

  let durationMs = 0;

  try {
    if (!options.dryRun) {
      const started = Date.now();

      await client.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 1) create new rows
          if (toCreate.length > 0) {
            // Prefer fast path if the delegate supports it
            const anyTx = tx as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            const hasCreateMany = typeof anyTx?.vendorCatalogItem?.createMany === 'function';

            if (hasCreateMany) {
              const chunkSize = 250;
              for (let i = 0; i < toCreate.length; i += chunkSize) {
                const batch = toCreate.slice(i, i + chunkSize);
                await anyTx.vendorCatalogItem.createMany({
                  data: batch.map((c) => ({
                    vendor: MOSCOT_VENDOR,
                    catalogId: c.catalogId,
                    payload: c.payload,
                    hash: c.hash,
                  })),
                  skipDuplicates: true,
                });
              }
            } else {
              // Fallback for test stubs that don't implement createMany
              for (const c of toCreate) {
                await tx.vendorCatalogItem.create({
                  data: {
                    vendor: MOSCOT_VENDOR,
                    catalogId: c.catalogId,
                    payload: c.payload,
                    hash: c.hash,
                  },
                });
              }
            }
          }

          // 2) updates
          for (const u of toUpdate) {
            await tx.vendorCatalogItem.update({
              where: { id: u.id },
              data: { payload: u.payload, hash: u.hash },
            });
          }

          // 3) deletions
          if (toRemove.length > 0) {
            await tx.vendorCatalogItem.deleteMany({
              where: { vendor: MOSCOT_VENDOR, catalogId: { in: toRemove } },
            });
          }

          // 4) snapshot (set lastDurationMs=0; we update real duration after tx ends)
          await tx.vendorSyncState.upsert({
            where: { vendor: MOSCOT_VENDOR },
            update: {
              lastHash: aggregate,
              lastSource: sourcePath,
              lastRunAt: new Date(),
              lastRunBy: actor,
              totalItems: payloads.size,
              lastDurationMs: 0,
              lastError: null,
            },
            create: {
              vendor: MOSCOT_VENDOR,
              lastHash: aggregate,
              lastSource: sourcePath,
              lastRunAt: new Date(),
              lastRunBy: actor,
              totalItems: payloads.size,
              lastDurationMs: 0,
            },
          });
        },
        { timeout: 20000, maxWait: 5000 },
      );

      durationMs = Date.now() - started;

      // Update snapshot with final duration (tolerate missing delegate in tests)
      try {
        await (client as any).vendorSyncState?.update?.({ // eslint-disable-line @typescript-eslint/no-explicit-any
          where: { vendor: MOSCOT_VENDOR },
          data: { lastDurationMs: durationMs },
        });
      } catch {
        /* delegate may not exist in test stubs; skip */
      }
    } else {
      durationMs = 0;
    }

    // Mark run success
    if (runId) {
      try {
        await (client as any).vendorSyncRun?.update?.({ // eslint-disable-line @typescript-eslint/no-explicit-any
          where: { id: runId },
          data: {
            status: VendorSyncRunStatus.Success,
            durationMs,
            finishedAt: new Date(),
            hash: aggregate,
            totalItems: payloads.size,
            createdCount: toCreate.length || null,
            updatedCount: toUpdate.length || null,
            unchangedCount: unchanged || null,
            removedCount: toRemove.length || null,
          },
        });
      } catch {
        // ignore in tests
      }
    }

    return {
      vendor: MOSCOT_VENDOR,
      sourcePath,
      total: payloads.size,
      created: toCreate.length,
      updated: toUpdate.length,
      unchanged,
      removed: toRemove.length,
      hash: aggregate,
      dryRun: Boolean(options.dryRun),
      durationMs,
      timestamp: new Date().toISOString(),
      runId,
      status: 'Success',
    };
  } catch (err) {
    // Mark run failed with error
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      try {
        await (client as any).vendorSyncRun?.update?.({ // eslint-disable-line @typescript-eslint/no-explicit-any
          where: { id: runId },
          data: {
            status: VendorSyncRunStatus.Failed,
            error: message,
            durationMs,
            finishedAt: new Date(),
          },
        });
      } catch {
        // ignore in tests
      }
    }
    throw err;
  }
}
