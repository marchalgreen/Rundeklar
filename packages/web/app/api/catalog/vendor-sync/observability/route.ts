import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fetchVendorSyncObservability } from '@/lib/vendorSync';
import { DEFAULT_VENDOR_SLUG, normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z
  .object({
    vendorId: z.string().trim().min(1, 'vendorId is required'),
    start: z.coerce.date(),
    end: z.coerce.date(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    cursor: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.start.valueOf() > value.end.valueOf()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['start'],
        message: 'start must be before end',
      });
    }
  });

function readQuery(req: NextRequest) {
  const url = new URL(req.url);
  const vendorId = normalizeVendorSlug(
    url.searchParams.get('vendorId') ??
      url.searchParams.get('vendor') ??
      url.searchParams.get('v') ??
      '',
  );
  const start = url.searchParams.get('start') ?? url.searchParams.get('from') ?? '';
  const end = url.searchParams.get('end') ?? url.searchParams.get('to') ?? '';
  const limit = url.searchParams.get('limit') ?? url.searchParams.get('pageSize') ?? undefined;
  const cursor = url.searchParams.get('cursor') ?? undefined;

  return {
    vendorId: vendorId || DEFAULT_VENDOR_SLUG,
    start,
    end,
    limit,
    cursor,
  };
}

async function handleRequest(req: NextRequest, raw: Record<string, unknown>) {
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_request',
        detail: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { vendorId, start, end, limit, cursor } = parsed.data;

  try {
    const data = await fetchVendorSyncObservability({
      vendorId,
      start,
      end,
      limit,
      cursor: cursor ?? null,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[api/catalog/vendor-sync/observability] failed', { err: message });
    return NextResponse.json(
      { ok: false, error: 'failed_to_load_observability', detail: message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req, readQuery(req));
}
