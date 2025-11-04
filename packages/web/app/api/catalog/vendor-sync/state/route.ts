import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { DEFAULT_VENDOR_SLUG, normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  try {
    const client = await prisma;
    const row = await client.vendorSyncState.findUnique({ where: { vendor } });

    if (!row) {
      return NextResponse.json({ ok: true, snapshot: null });
    }

    return NextResponse.json({
      ok: true,
      snapshot: {
        vendor: row.vendor,
        totalItems: row.totalItems,
        lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
        lastDurationMs: row.lastDurationMs ?? null,
        lastSource: row.lastSource ?? null,
        lastHash: row.lastHash ?? null,
        lastRunBy: row.lastRunBy ?? null,
        lastError: row.lastError ?? null,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[api/catalog/vendor-sync/state] failed', { err: message });
    return NextResponse.json(
      { ok: false, error: 'failed_to_fetch_state', detail: message },
      { status: 500 },
    );
  }
}
