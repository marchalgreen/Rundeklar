import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db'; // this is a Promise in your repo

const BodySchema = z.object({
  credentials: z
    .object({
      scraperPath: z.string().nullable().optional(),
      apiBaseUrl: z.string().url().nullable().optional(),
      apiKey: z.string().nullable().optional(),
    })
    .passthrough()
    .optional(),
});

// NOTE: Next 15 expects context.params to be a Promise<...>
export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params; // <- await the params

    if (!slug?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'invalid_vendor', detail: 'Missing vendor slug' },
        { status: 400 },
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'invalid_payload', detail: parsed.error.message },
        { status: 422 },
      );
    }

    const db = await prisma; // <- await your prisma Promise

    const vendor = await db.vendor.findUnique({
      where: { slug },
      include: { integration: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { ok: false, error: 'vendor_not_found', detail: `Unknown vendor: ${slug}` },
        { status: 404 },
      );
    }

    const creds = parsed.data.credentials ?? {};
    const { scraperPath, apiBaseUrl, apiKey } = creds as {
      scraperPath?: string | null;
      apiBaseUrl?: string | null;
      apiKey?: string | null;
    };

    // Infer type if integration doesn't exist yet (no schema change)
    const inferredType: 'API' | 'SCRAPER' =
      vendor.integration?.type ?? (apiBaseUrl ? 'API' : 'SCRAPER');

    await db.vendorIntegration.upsert({
      where: { vendorId: vendor.id },
      create: {
        vendorId: vendor.id,
        type: inferredType,
        scraperPath: scraperPath ?? null,
        apiBaseUrl: apiBaseUrl ?? null,
        apiAuthType: vendor.integration?.apiAuthType ?? null,
        apiKey: apiKey ?? null,
        lastTestAt: vendor.integration?.lastTestAt ?? null,
        lastTestOk: vendor.integration?.lastTestOk ?? null,
        meta: vendor.integration?.meta ?? null,
      },
      update: {
        scraperPath: scraperPath ?? null,
        apiBaseUrl: apiBaseUrl ?? null,
        apiKey: apiKey ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unhandled error while saving credentials';
    return NextResponse.json({ ok: false, error: 'server_error', detail }, { status: 500 });
  }
}
