import { z, ZodError } from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireServiceJwt, ServiceAuthError } from '@/lib/auth/serviceToken';
import {
  NormalizationAdapterNotFoundError,
  NormalizationExecutionError,
  NormalizationInputError,
  NormalizationOutputError,
  normalizeVendorItem,
} from '@/lib/catalog/normalization/normalizers';
import { resolveVendorSlug } from '@/lib/catalog/vendorSlugs';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Supports two modes:
 *  A) { item }                          -> normalize a single raw item
 *  B) { sample?, sourcePath? }          -> sample from DB or an explicit sourcePath and return a list
 */
const PreviewBodySchema = z.object({
  item: z.unknown().optional(),
  sample: z.number().int().positive().max(100).optional(), // default to 5 when used
  sourcePath: z.string().min(1).optional(),
});

type RouteContext = { params: { slug?: string } | Promise<{ slug?: string }> };

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<T>).then === 'function'
  );
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
    const rawSlug = params.slug?.trim();
    if (!rawSlug) {
      return makeErrorResponse(400, 'missing_vendor_slug', 'Vendor slug is required');
    }
    const slug = resolveVendorSlug(rawSlug);

    const auth = await requireServiceJwt(req);
    const scopes = new Set(auth?.scopes ?? []);
    if (!scopes.has('catalog:sync:write') && !scopes.has('catalog:normalize:preview')) {
      return makeErrorResponse(403, 'insufficient_scope', 'catalog:sync:write scope required');
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PreviewBodySchema.parse(body);

    // -------- Mode A: Explicit single item ----------
    if (parsed.item !== undefined) {
      const product = normalizeVendorItem(slug, parsed.item);
      return NextResponse.json({
        ok: true as const,
        vendor: slug,
        product,
      });
    }

    // -------- Mode B: Sample (from sourcePath or DB) ----------
    const sample = parsed.sample ?? 5;

    // Prefer explicit sourcePath if provided (dev-friendly)
    if (parsed.sourcePath) {
      const items = await loadFromSourcePath(parsed.sourcePath, sample);
      const normalizedSample = safeNormalize(slug, items);
      return NextResponse.json({
        ok: true as const,
        vendor: slug,
        count: normalizedSample.length,
        normalizedSample,
        meta: { source: parsed.sourcePath },
      });
    }

    // Otherwise load recent persisted raw items from DB
    const db = await prisma;
    const rows = await db.vendorCatalogItem.findMany({
      where: { vendor: slug },
      orderBy: { createdAt: 'desc' },
      take: Math.max(sample * 2, sample), // oversample then filter nulls
      select: { payload: true },
    });

    const rawItems = rows
      .map((r: { payload: unknown }) =>
        r && r.payload && typeof r.payload === 'object'
          ? (r.payload as Record<string, unknown>)
          : null,
      )
      .filter((p: Record<string, unknown> | null): p is Record<string, unknown> => !!p)
      .slice(0, sample);

    if (rawItems.length === 0) {
      // Graceful empty response (no Zod explosions)
      return NextResponse.json({
        ok: true as const,
        vendor: slug,
        count: 0,
        normalizedSample: [],
        meta: { source: 'db' },
      });
    }

    const normalizedSample = safeNormalize(slug, rawItems);
    return NextResponse.json({
      ok: true as const,
      vendor: slug,
      count: normalizedSample.length,
      normalizedSample,
      meta: { source: 'db' },
    });
  } catch (err) {
    if (err instanceof ServiceAuthError) {
      return makeErrorResponse(err.status, err.code, err.message);
    }

    if (err instanceof ZodError) {
      const detail = err.issues.map((issue) => issue.message).join('; ') || err.message;
      return makeErrorResponse(400, 'invalid_request', detail);
    }

    if (err instanceof NormalizationAdapterNotFoundError) {
      return makeErrorResponse(404, 'vendor_not_supported', err.message);
    }

    if (err instanceof NormalizationInputError) {
      const detail = err.cause instanceof ZodError ? err.cause.message : err.message;
      return makeErrorResponse(422, 'invalid_vendor_payload', detail);
    }

    if (err instanceof NormalizationOutputError) {
      const detail = err.cause instanceof ZodError ? err.cause.message : err.message;
      return makeErrorResponse(500, 'invalid_normalized_product', detail);
    }

    if (err instanceof NormalizationExecutionError) {
      return makeErrorResponse(500, 'normalization_failed', err.message);
    }

    const detail = err instanceof Error ? err.message : String(err);
    return makeErrorResponse(500, 'error', detail);
  }
}

/** Normalize a list defensively: drop bad rows, keep good ones */
function safeNormalize(slug: string, items: Array<Record<string, unknown>>) {
  const out: any[] = [];
  for (const raw of items) {
    try {
      out.push(normalizeVendorItem(slug, raw));
    } catch {
      // ignore individual bad rows
    }
  }
  return out;
}

/**
 * Minimal dev loader for sourcePath.
 * Reuse your real loader here if you already have one in /sync.
 */
async function loadFromSourcePath(
  path: string,
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(path, 'utf8');
    const data = JSON.parse(raw);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    return arr
      .slice(0, limit)
      .filter((x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object');
  } catch {
    return [];
  }
}
