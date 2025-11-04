import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireServiceJwt, ServiceAuthError } from '@/lib/auth/serviceToken';
import { MOSCOT_VENDOR } from '@/lib/catalog/moscotSync';
import {
  VendorSyncRunDetailResponseSchema,
  formatVendorSyncRun,
} from '@/lib/catalog/vendorSyncRuns';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type ParamsCtx = { params: Promise<{ runId: string }> };

export async function GET(req: NextRequest, ctx: ParamsCtx) {
  const params = await ctx.params;
  try {
    await requireServiceJwt(req, { scope: ['catalog:sync', 'catalog:sync:moscot'] });
    const { runId } = params;

    const client = await prisma;
    const run = await client.vendorSyncRun.findFirst({
      where: { id: runId, vendor: MOSCOT_VENDOR },
    });

    if (!run) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const payload = VendorSyncRunDetailResponseSchema.parse({
      ok: true,
      data: formatVendorSyncRun(run),
    });

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof ServiceAuthError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    const { runId } = params;
    console.error('[api/catalog/moscot/sync/runs/:runId] error', {
      error: message,
      runId,
    });
    return NextResponse.json(
      { ok: false, error: 'internal_error', detail: message },
      { status: 500 },
    );
  }
}
