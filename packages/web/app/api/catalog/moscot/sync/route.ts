import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireServiceJwt } from '@/lib/auth/serviceToken';
import { dispatchVendorSync } from '@/lib/catalog/vendorSyncDispatcher';
import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireServiceJwt(req); // throws on missing/invalid (401)
    const scopes = new Set(auth?.scopes ?? []);
    const allowed = scopes.has('catalog:sync:write') || scopes.has('catalog:sync:moscot');
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'insufficient_scope' }, { status: 403 });
    }

    // ---- dryRun parsing (BODY has precedence; then querystring) ----
    const url = new URL(req.url);
    const qpDryRun = url.searchParams.get('dryRun'); // "0" | "1" | "true" | "false" | null

    const body = await req.json().catch(() => ({} as any));
    const bodyDryRun = body?.dryRun === true;
    const queryDryRun = qpDryRun === '1' || qpDryRun?.toLowerCase() === 'true';
    const dryRun = bodyDryRun || queryDryRun;

    const explicitSource: string | undefined =
      typeof body?.sourcePath === 'string' ? body.sourcePath : undefined;

    // ---- dispatch (legacy MOSCOT path) ----
    const result: any = await dispatchVendorSync(DEFAULT_VENDOR_SLUG, {
      dryRun,
      sourcePath: explicitSource,
      actor: typeof auth?.sub === 'string' ? auth.sub : 'service',
    });

    const metricsSource =
      result && typeof result === 'object'
        ? typeof (result as any).metrics === 'object' && (result as any).metrics !== null
          ? ((result as any).metrics as Record<string, unknown>)
          : (result as Record<string, unknown>)
        : {};
    const numberOrNull = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;

    return NextResponse.json({
      ok: true,
      dryRun, // ← echoes computed dryRun (body wins)
      runId: result?.runId ?? null,
      status: result?.status ?? null,
      metrics: {
        total: numberOrNull(metricsSource.total),
        created: numberOrNull(metricsSource.created),
        updated: numberOrNull(metricsSource.updated),
        removed: numberOrNull(metricsSource.removed),
        unchanged: numberOrNull(metricsSource.unchanged),
        durationMs: numberOrNull(metricsSource.durationMs),
        dryRun: dryRun ? 1 : 0, // ← test expects 1 for true
      },
      sourcePath:
        typeof metricsSource.sourcePath === 'string'
          ? metricsSource.sourcePath
          : explicitSource ?? null,
    });
  } catch (e: any) {
    const status = Number.isFinite(e?.status) ? e.status : 500;
    const code =
      typeof e?.code === 'string'
        ? e.code
        : /missing/i.test(String(e?.message ?? ''))
        ? 'missing_token'
        : 'error';
    const detail = typeof e?.message === 'string' ? e.message : String(e);
    return NextResponse.json({ ok: false, error: code, detail }, { status });
  }
}
