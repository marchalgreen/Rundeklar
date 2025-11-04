import { NextResponse } from 'next/server';

import { VendorSyncRunStatus } from '@prisma/client';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OverviewMetrics = {
  last24h: {
    total: number;
    success: number;
    failed: number;
    avgDurationMs: number;
  };
  inProgress: Array<{
    vendor: string;
    startedAt: string;
    runId: string;
    mode: 'preview' | 'apply';
  }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const PrismaStatuses = (VendorSyncRunStatus ?? {
  Pending: 'Pending',
  Success: 'Success',
  Failed: 'Failed',
}) as Record<string, string>;

function toMode(dryRun: unknown): 'preview' | 'apply' {
  if (typeof dryRun === 'boolean') {
    return dryRun ? 'preview' : 'apply';
  }
  if (typeof dryRun === 'number') {
    return dryRun !== 0 ? 'preview' : 'apply';
  }
  if (typeof dryRun === 'string') {
    const normalized = dryRun.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return 'preview';
  }
  return 'apply';
}

export async function GET() {
  try {
    const client = await prisma;

    const since = new Date(Date.now() - DAY_MS);

    const [total, success, failed, average, pending] = await Promise.all([
      client.vendorSyncRun.count({
        where: {
          startedAt: { gte: since },
        },
      }),
      client.vendorSyncRun.count({
        where: {
          startedAt: { gte: since },
          status: PrismaStatuses.Success,
        },
      }),
      client.vendorSyncRun.count({
        where: {
          startedAt: { gte: since },
          status: PrismaStatuses.Failed,
        },
      }),
      client.vendorSyncRun.aggregate({
        where: {
          startedAt: { gte: since },
          status: { in: [PrismaStatuses.Success, PrismaStatuses.Failed] },
          durationMs: { not: null },
        },
        _avg: { durationMs: true },
      }),
      client.vendorSyncRun.findMany({
        where: { status: PrismaStatuses.Pending },
        select: { id: true, vendor: true, startedAt: true, dryRun: true },
        orderBy: { startedAt: 'asc' },
      }),
    ]);

    const avgDurationRaw = average._avg?.durationMs ?? 0;
    const avgDuration = Number.isFinite(avgDurationRaw) ? Number(avgDurationRaw) : 0;

    const metrics: OverviewMetrics = {
      last24h: {
        total,
        success,
        failed,
        avgDurationMs: Math.max(0, Math.round(avgDuration)),
      },
      inProgress: pending.map(
        (run: { id: string; vendor: string; startedAt: Date; dryRun: unknown }): OverviewMetrics['inProgress'][number] => ({
          vendor: run.vendor,
          startedAt: run.startedAt.toISOString(),
          runId: run.id,
          mode: toMode(run.dryRun),
        }),
      ),
    };

    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown_error';
    console.error('[api/catalog/vendor-sync/overview] failed', { err: detail });
    return NextResponse.json(
      { ok: false, error: 'failed_to_load_overview', detail },
      { status: 500 },
    );
  }
}
