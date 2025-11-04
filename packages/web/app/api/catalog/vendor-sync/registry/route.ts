import { NextResponse } from 'next/server';

import type { VendorSyncState } from '@prisma/client';
import { formatVendor, getPrismaClient, listVendors } from '@/lib/catalog/vendorRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getPrismaClient();
    const vendors = await listVendors(db);
    const slugs = vendors.map((vendor) => vendor.slug);
    const states: VendorSyncState[] =
      slugs.length > 0
        ? await db.vendorSyncState.findMany({ where: { vendor: { in: slugs } } })
        : [];
    const stateEntries = states.map((state) => [state.vendor, state] as const);
    const stateMap = new Map<string, VendorSyncState>(stateEntries);
    return NextResponse.json({
      ok: true,
      data: vendors.map((vendor) => formatVendor(vendor, { state: stateMap.get(vendor.slug) ?? null })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/catalog/vendor-sync/registry] failed to list vendors', { err: message });
    return NextResponse.json(
      { ok: false, error: 'failed_to_list_vendors', detail: message },
      { status: 500 },
    );
  }
}
