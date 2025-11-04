import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { testVendorIntegration } from '@/lib/catalog/vendorRegistry';
import { normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ParamsCtx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, ctx: ParamsCtx) {
  const params = await ctx.params;
  const normalized = normalizeVendorSlug(params.slug);
  if (!normalized) {
    return NextResponse.json({ ok: false, error: 'invalid_vendor' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const sourcePathOverride = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;

  try {
    const result = await testVendorIntegration(normalized, { sourcePathOverride });
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // ✅ Treat unknown vendor as "invalid_vendor" (400), not 404
    let status = 500;
    let code: 'invalid_vendor' | 'not_implemented' | 'test_failed' = 'test_failed';
    if (/not configured/i.test(message)) {
      status = 400;
      code = 'invalid_vendor';
    } else if (/not implemented/i.test(message)) {
      status = 501;
      code = 'not_implemented';
    }

    console.error('[api/catalog/vendor-sync/registry/:slug/test] failed', {
      err: message,
      slug: normalized,
    });
    return NextResponse.json({ ok: false, error: code, detail: message }, { status });
  }
}
