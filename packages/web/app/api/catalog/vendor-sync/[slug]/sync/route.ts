import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  requireServiceJwt,
  ServiceAuthError,
} from '@/lib/auth/serviceToken';
import {
  dispatchVendorSync,
  VendorSyncNotConfiguredError,
  VendorSyncUnsupportedIntegrationError,
} from '@/lib/catalog/vendorSyncDispatcher';
import {
  formatVendorSyncSummary,
  parseVendorSyncRequest,
  type VendorSyncMode,
} from '@/lib/catalog/vendorSyncSchemas';

export const runtime = 'nodejs';

type RouteContext = { params: { slug?: string } | Promise<{ slug?: string }> };

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as PromiseLike<T>).then === 'function';
}

async function resolveParams(context: RouteContext | undefined): Promise<{ slug?: string }> {
  if (!context) return {};
  const { params } = context;
  if (!params) return {};
  if (isPromiseLike(params)) {
    return (await params) ?? {};
  }
  return params;
}

function makeErrorResponse(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

export async function POST(req: NextRequest, context?: RouteContext) {
  try {
    const params = await resolveParams(context);
    const slug = params.slug?.trim();
    if (!slug) {
      return makeErrorResponse(400, 'missing_vendor_slug', 'Vendor slug is required');
    }

    const auth = await requireServiceJwt(req);
    const scopes = new Set(auth?.scopes ?? []);
    if (!scopes.has('catalog:sync:write')) {
      return makeErrorResponse(403, 'insufficient_scope', 'catalog:sync:write scope required');
    }

    const body = await req.json().catch(() => ({}));
    const parsed = parseVendorSyncRequest({ url: req.url, body });
    const summary = await dispatchVendorSync(slug, {
      dryRun: parsed.dryRun,
      sourcePath: parsed.sourcePath,
      actor: typeof auth?.sub === 'string' ? auth.sub : 'service',
      inject: parsed.inject,
    });

    const mode: VendorSyncMode = parsed.mode;
    const formatted = formatVendorSyncSummary(summary);

    return NextResponse.json({
      ok: true as const,
      mode,
      runId: summary.runId ?? null,
      summary: formatted,
    });
  } catch (err) {
    if (err instanceof ServiceAuthError) {
      return makeErrorResponse(err.status, err.code, err.message);
    }

    if (err instanceof ZodError) {
      const detail = err.issues.map((issue) => issue.message).join('; ') || err.message;
      return makeErrorResponse(400, 'invalid_request', detail);
    }

    if (err instanceof VendorSyncNotConfiguredError) {
      return makeErrorResponse(404, 'vendor_not_configured', err.message);
    }

    if (err instanceof VendorSyncUnsupportedIntegrationError) {
      return makeErrorResponse(501, 'integration_not_supported', err.message);
    }

    const detail = err instanceof Error ? err.message : String(err);
    return makeErrorResponse(500, 'error', detail);
  }
}
