import { z, ZodError } from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { DiffResult } from '@/lib/catalog/sync/diffEngine';

import { requireServiceJwt, ServiceAuthError } from '@/lib/auth/serviceToken';
import {
  normalizeVendorItem,
  NormalizationAdapterNotFoundError,
  NormalizationExecutionError,
  NormalizationInputError,
  NormalizationOutputError,
} from '@/lib/catalog/normalization/normalizers';
import type { NormalizedProduct } from '@/lib/catalog/normalization/types';
import { resolveVendorSlug } from '@/lib/catalog/vendorSlugs';
import { prisma } from '@/lib/db';
import { executeApply, type ApplyEngineResult } from '@/lib/catalog/sync/applyEngine';

type RouteContext = { params: { slug?: string } | Promise<{ slug?: string }> } | undefined;

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<T>).then === 'function'
  );
}

async function resolveParams(context: RouteContext) {
  if (!context) return {};
  const params = context.params;
  if (!params) return {};
  if (isPromiseLike(params)) {
    return (await params) ?? {};
  }
  return params;
}

const RequestBodySchema = z
  .object({
    items: z.array(z.unknown()).optional(),
    sourcePath: z.string().min(1).optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .passthrough();

type HandlerOptions = {
  dryRun: boolean;
};

function makeErrorResponse(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

async function loadFromSourcePath(path: string, limit?: number): Promise<unknown[]> {
  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(path, 'utf8');
    const data = JSON.parse(raw);
    const items = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] })?.items)
      ? ((data as { items?: unknown[] }).items as unknown[])
      : [];
    if (typeof limit === 'number' && Number.isFinite(limit)) {
      return items.slice(0, limit);
    }
    return items;
  } catch (err) {
    console.error('[vendor-sync preview/apply] Failed to load sourcePath', { path, err });
    return [];
  }
}

function sanitizeNormalized(product: NormalizedProduct) {
  const { raw: _raw, ...rest } = product as NormalizedProduct & { raw?: unknown };
  return rest;
}

function formatDiff(diff: DiffResult) {
  return {
    hash: diff.hash,
    counts: diff.counts,
    items: diff.items.map((item: any) => ({
      catalogId: item.catalogId,
      status: item.status,
      catalogItemId: item.catalogItemId,
      product: {
        before: item.productBefore,
        after: item.productAfter,
        changes: item.productChanges,
      },
      stocks: item.stockChanges,
      normalized: sanitizeNormalized(item.normalized),
    })),
    removed: diff.removed,
  };
}

function formatApplyResult(result: ApplyEngineResult) {
  return {
    runId: result.runId,
    summary: result.summary,
  };
}

function determineSourceMeta(body: z.infer<typeof RequestBodySchema>) {
  if (body.sourcePath) {
    return { type: 'sourcePath' as const, value: body.sourcePath };
  }
  if (Array.isArray(body.items)) {
    return { type: 'inline' as const, count: body.items.length };
  }
  return { type: 'unknown' as const };
}

function assertItems(input: z.infer<typeof RequestBodySchema>): unknown[] {
  if (Array.isArray(input.items) && input.items.length > 0) {
    return input.items;
  }
  if (input.sourcePath) {
    return [];
  }
  throw new ZodError([
    {
      code: z.ZodIssueCode.custom,
      message: 'Either items[] or sourcePath is required',
      path: ['items'],
    },
  ]);
}

async function normalizeItems(vendor: string, rawItems: unknown[]): Promise<NormalizedProduct[]> {
  const products: NormalizedProduct[] = [];
  for (const payload of rawItems) {
    products.push(normalizeVendorItem(vendor, payload));
  }
  return products;
}

export async function handlePreviewApply(
  req: NextRequest,
  context: RouteContext,
  options: HandlerOptions,
) {
  try {
    const params = await resolveParams(context);
    const slug = params.slug?.trim();
    if (!slug) {
      return makeErrorResponse(400, 'missing_vendor_slug', 'Vendor slug is required');
    }

    const vendor = resolveVendorSlug(slug);

    const auth = await requireServiceJwt(req);
    const scopes = new Set(auth?.scopes ?? []);
    if (!scopes.has('catalog:sync:write')) {
      return makeErrorResponse(403, 'insufficient_scope', 'catalog:sync:write scope required');
    }

    const actor =
      typeof auth?.sub === 'string' && auth.sub.trim().length > 0 ? auth.sub : 'service';

    const bodyJson = await req.json().catch(() => ({}));
    const body = RequestBodySchema.parse(bodyJson ?? {});

    let rawItems = assertItems(body);
    if (rawItems.length === 0 && body.sourcePath) {
      rawItems = await loadFromSourcePath(body.sourcePath, body.limit);
    }

    const normalized = await normalizeItems(vendor, rawItems);

    const client = await prisma;
    const [catalogItems, products] = await Promise.all([
      client.vendorCatalogItem.findMany({
        where: { vendor },
      }),
      client.product.findMany({
        where: {
          OR: [
            { sku: { startsWith: `${vendor}:` } },
            { supplier: vendor },
            { supplier: vendor.toUpperCase() },
          ],
        },
        include: { stocks: true },
      }),
    ]);

    const run = await executeApply({
      prisma: client,
      vendor,
      actor,
      sourcePath: body.sourcePath ?? (Array.isArray(body.items) ? '(inline)' : null),
      normalized,
      existingCatalogItems: catalogItems,
      existingProducts: products,
      dryRun: options.dryRun,
    });

    const formattedDiff = formatDiff(run.diff);

    return NextResponse.json({
      ok: true as const,
      vendor,
      mode: options.dryRun ? 'preview' : 'apply',
      dryRun: options.dryRun,
      meta: determineSourceMeta(body),
      normalizedCount: normalized.length,
      diff: formattedDiff,
      run: formatApplyResult(run),
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
