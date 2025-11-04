import { NextRequest, NextResponse } from 'next/server';

import { formatVendorSyncRun } from '@/lib/catalog/vendorSyncRuns';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 10;

type HistoryRun = {
  runId: string;
  status: string;
  totalItems: number | null;
  durationMs: number | null;
  finishedAt: string | null;
};

function parseLimit(value: string | null): number {
  if (!value) return 5;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  const normalized = Math.trunc(parsed);
  if (Number.isNaN(normalized) || normalized <= 0) return 5;
  return Math.min(MAX_LIMIT, normalized);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  try {
    const client = await prisma;

    const vendors = await client.vendorSyncRun.findMany({
      distinct: ['vendor'],
      select: { vendor: true },
      orderBy: { vendor: 'asc' },
    });

    const histories = await Promise.all(
      vendors.map(async ({ vendor }: { vendor: string }) => {
        const runs = await client.vendorSyncRun.findMany({
          where: { vendor },
          orderBy: { startedAt: 'desc' },
          take: limit,
        });

        const normalized = runs.map((run: unknown): HistoryRun => {
          const formatted = formatVendorSyncRun(run);
          return {
            runId: formatted.id,
            status: formatted.status,
            totalItems: formatted.counts.total,
            durationMs: formatted.durationMs,
            finishedAt: formatted.completedAt,
          };
        });

        return { vendor, runs: normalized };
      }),
    );

    return NextResponse.json({ ok: true, vendors: histories });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown_error';
    console.error('[api/catalog/vendor-sync/history] failed', { err: detail });
    return NextResponse.json(
      { ok: false, error: 'failed_to_load_history', detail },
      { status: 500 },
    );
  }
}

