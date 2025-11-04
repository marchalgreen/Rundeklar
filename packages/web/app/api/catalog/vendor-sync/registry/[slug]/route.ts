import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { formatVendor, getVendorBySlug } from '@/lib/catalog/vendorRegistry';
import { normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ParamsCtx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: ParamsCtx) {
  const params = await ctx.params;
  const normalized = normalizeVendorSlug(params.slug);
  if (!normalized) {
    return NextResponse.json({ ok: false, error: 'invalid_vendor' }, { status: 400 });
  }

  try {
    const vendor = await getVendorBySlug(normalized);
    if (!vendor) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: formatVendor(vendor) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/catalog/vendor-sync/registry/:slug] failed', { err: message, slug: normalized });
    return NextResponse.json(
      { ok: false, error: 'failed_to_load_vendor', detail: message },
      { status: 500 },
    );
  }
}
