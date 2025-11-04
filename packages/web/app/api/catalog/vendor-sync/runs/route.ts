import { NextRequest, NextResponse } from 'next/server';
import { VendorSyncRunStatus } from '@prisma/client';

import {
  VendorSyncRunListResponseSchema,
  formatVendorSyncRun,
  makeVendorSyncRunListResponse,
} from '@/lib/catalog/vendorSyncRuns';
import { DEFAULT_VENDOR_SLUG, normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PrismaStatuses = (VendorSyncRunStatus ?? {
  Pending: 'Pending',
  Success: 'Success',
  Failed: 'Failed',
}) as Record<string, string>;

const STATUS_MAP: Record<string, string> = {
  running: PrismaStatuses.Pending,
  success: PrismaStatuses.Success,
  error: PrismaStatuses.Failed,
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // 1) Try query first (case-insensitive; allow alias "v")
  let vendor = '';
  let sawVendorKey = false;
  for (const [k, v] of url.searchParams.entries()) {
    const key = k.toLowerCase();
    if (key === 'vendor' || key === 'v') {
      sawVendorKey = true;
      const val = normalizeVendorSlug(v);
      if (val) {
        vendor = val;
        break;
      }
    }
  }
  // 2) If not found, try headers (x-vendor, vendor, x-vendor-slug)
  if (!vendor) {
    for (const [k, v] of req.headers.entries()) {
      const key = k.toLowerCase();
      if (key === 'x-vendor' || key === 'vendor' || key === 'x-vendor-slug') {
        const val = normalizeVendorSlug(v);
        if (val) {
          vendor = val;
          break;
        }
        sawVendorKey = true;
      }
    }
  }
  // 3) If a vendor key was provided but value is empty → 400
  if (!vendor && sawVendorKey) {
    return NextResponse.json({ ok: false, error: 'missing_vendor' }, { status: 400 });
  }
  // 4) No vendor key at all → default to MOSCOT (test expectation)
  if (!vendor) vendor = DEFAULT_VENDOR_SLUG;

  const limitParam = url.searchParams.get('limit');
  let limit = 20;
  if (limitParam != null) {
    const parsedLimit = Number(limitParam);
    if (Number.isFinite(parsedLimit)) {
      limit = Math.max(1, Math.min(100, Math.trunc(parsedLimit)));
    }
  }
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const statuses = url
    .searchParams
    .getAll('status')
    .map((value) => STATUS_MAP[value.toLowerCase()])
    .filter((value): value is string => Boolean(value));

  try {
    const client = await prisma;
    const where: Record<string, unknown> = { vendor };
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    const [totalItems, runs] = await Promise.all([
      client.vendorSyncRun.count({ where }),
      client.vendorSyncRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    ]);

    const hasExtra = runs.length > limit;
    const page = hasExtra ? runs.slice(0, limit) : runs;
    const nextCursor = hasExtra ? runs[limit].id : null;
    const normalized = page.map((run: unknown) => formatVendorSyncRun(run));
    const payload = makeVendorSyncRunListResponse(normalized, {
      page: 1,
      pageSize: limit,
      totalItems,
      hasMore: Boolean(nextCursor),
      nextCursor,
    });

    const data = VendorSyncRunListResponseSchema.parse(payload);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[api/catalog/vendor-sync/runs] failed', { err: message });
    return NextResponse.json(
      { ok: false, error: 'failed_to_fetch_runs', detail: message },
      { status: 500 },
    );
  }
}
