import { formatVendorSyncRun } from '@/lib/catalog/vendorSyncRuns';
import { prisma } from '@/lib/db';

export type FetchVendorSyncObservabilityInput = {
  vendorId: string;
  start: Date;
  end: Date;
  limit?: number;
  cursor?: string | null;
};

export type VendorSyncObservabilityResult = {
  vendorId: string;
  range: { start: string; end: string };
  pageSize: number;
  totalRuns: number;
  counts: {
    success: number;
    error: number;
    running: number;
  };
  latestRunAt: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  runs: ReturnType<typeof formatVendorSyncRun>[];
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

export async function fetchVendorSyncObservability(
  params: FetchVendorSyncObservabilityInput,
): Promise<VendorSyncObservabilityResult> {
  const client = await prisma;
  const limit = Math.trunc(params.limit ?? DEFAULT_LIMIT);
  const pageSize = Math.max(1, Math.min(MAX_LIMIT, limit));

  const where = {
    vendor: params.vendorId,
    startedAt: {
      gte: params.start,
      lte: params.end,
    },
  } as const;

  const [totalRuns, runs] = await Promise.all([
    client.vendorSyncRun.count({ where }),
    client.vendorSyncRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: pageSize + 1,
      ...(params.cursor
        ? {
            cursor: { id: params.cursor },
            skip: 1,
          }
        : {}),
    }),
  ]);

  const hasExtra = runs.length > pageSize;
  const page = hasExtra ? runs.slice(0, pageSize) : runs;
  const nextCursor = hasExtra ? runs[pageSize].id : null;

  const normalizedRuns = page.map((run: unknown) => formatVendorSyncRun(run));

  const counts = normalizedRuns.reduce(
    (acc: any, run: any) => {
      if (run.status === 'success') acc.success += 1;
      else if (run.status === 'error') acc.error += 1;
      else if (run.status === 'running') acc.running += 1;
      return acc;
    },
    { success: 0, error: 0, running: 0 } as any,
  );

  return {
    vendorId: params.vendorId,
    range: {
      start: params.start.toISOString(),
      end: params.end.toISOString(),
    },
    pageSize,
    totalRuns,
    counts,
    latestRunAt: page.length ? page[0].startedAt.toISOString() : null,
    hasMore: hasExtra,
    nextCursor,
    runs: normalizedRuns,
  };
}
