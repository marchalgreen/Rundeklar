import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { VendorSyncRunStatus, type VendorSyncRun as PrismaVendorSyncRun } from '@prisma/client';
import { requireServiceJwt } from '@/lib/auth/serviceToken';
import { prisma } from '@/lib/db';
import {
  VendorSyncRunListResponseSchema,
  formatVendorSyncRun,
  makeVendorSyncRunListResponse,
} from '@/lib/catalog/vendorSyncRuns';
import { DEFAULT_VENDOR_SLUG, normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';

const PrismaStatuses = (VendorSyncRunStatus ?? {
  Pending: 'Pending',
  Success: 'Success',
  Failed: 'Failed',
}) as Record<string, string>;

const mapStrToEnum: Record<string, string> = {
  running: PrismaStatuses.Pending,
  success: PrismaStatuses.Success,
  error: PrismaStatuses.Failed,
};

export async function GET(req: NextRequest) {
  await requireServiceJwt(req);
  const url = new URL(req.url);
  const vendor = normalizeVendorSlug(url.searchParams.get('vendor')) || DEFAULT_VENDOR_SLUG;
  const statusParams = url.searchParams.getAll('status');
  const requestedLimit = Number(url.searchParams.get('limit') ?? 20);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.trunc(requestedLimit), 100)
      : 20;
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const statuses = statusParams
    .map((s) => mapStrToEnum[s])
    .filter((value): value is string => Boolean(value));
  const where: Record<string, unknown> = { vendor };
  if (statuses.length) where.status = { in: statuses };

  const client = await prisma;
  const [totalItems, runs] = await Promise.all([
    client.vendorSyncRun.count({ where }),
    client.vendorSyncRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
  ]);

  const nextCursor = runs.length > limit ? runs[limit].id : null;
  const page: PrismaVendorSyncRun[] = runs.slice(0, limit);
  const normalized = page.map((run) => formatVendorSyncRun(run));
  const response = makeVendorSyncRunListResponse(normalized, {
    page: 1,
    pageSize: limit,
    totalItems,
    hasMore: Boolean(nextCursor),
    nextCursor,
  });

  const payload = VendorSyncRunListResponseSchema.parse(response);

  return NextResponse.json(payload);
}
