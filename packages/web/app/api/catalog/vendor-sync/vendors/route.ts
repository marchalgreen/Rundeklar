import type { VendorSyncState } from '@prisma/client';
import type { ZodIssue } from 'zod';
import { NextResponse } from 'next/server';

import { formatVendor, getPrismaClient, listVendors } from '@/lib/catalog/vendorRegistry';
import { vendorCreatePayloadSchema } from '@/lib/catalog/vendorOnboardingSchemas';
import { normalizeVendorSlug } from '@/lib/catalog/vendorSlugs';

type IntegrationKind = 'SCRAPER' | 'API';

type IntegrationCreateInput = {
  vendorId: string;
  type: IntegrationKind;
  scraperPath?: string | null;
  apiBaseUrl?: string | null;
  apiAuthType?: string | null;
  apiKey?: string | null;
};

function cleanupValue(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function mapIssuesToFields(issues: readonly ZodIssue[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (!key) continue;
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getPrismaClient();
    const vendors = await listVendors(db);
    const slugs = vendors.map((vendor) => vendor.slug);
    const states =
      slugs.length > 0
        ? await db.vendorSyncState.findMany({ where: { vendor: { in: slugs } } })
        : [];
    const stateEntries = states.map((state: VendorSyncState) => [state.vendor, state] as const);
    const stateMap = new Map<string, VendorSyncState>(stateEntries);
    return NextResponse.json({
      ok: true,
      vendors: vendors.map((vendor) => formatVendor(vendor, { state: stateMap.get(vendor.slug) ?? null })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/catalog/vendor-sync/vendors] failed to list vendors', { err: message });
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: 'Unable to load vendors' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'invalid_request', detail: 'Ugyldigt JSON payload' },
      { status: 400 },
    );
  }

  const parsed = vendorCreatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_request',
        detail: issues[0]?.message ?? 'Payloadet er ugyldigt',
        fieldErrors: mapIssuesToFields(issues),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const slug = normalizeVendorSlug(payload.slug);
  if (!slug) {
    return NextResponse.json(
      { ok: false, error: 'invalid_request', detail: 'Slug er ugyldig' },
      { status: 400 },
    );
  }

  try {
    const db = await getPrismaClient();
    const existing = await db.vendor.findUnique({ where: { slug } });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'slug_conflict', detail: 'Slug er allerede i brug' },
        { status: 409 },
      );
    }

    const vendorId = await db.$transaction(async (tx: any) => {
      const vendor = await tx.vendor.create({
        data: {
          slug,
          name: payload.name.trim(),
        },
      });

      const credentials = payload.credentials ?? {};
      const integrationData: IntegrationCreateInput = {
        vendorId: vendor.id,
        type: payload.integrationType,
      };

      if (payload.integrationType === 'SCRAPER') {
        integrationData.scraperPath = cleanupValue(credentials.scraperPath ?? null);
      }

      if (payload.integrationType === 'API') {
        integrationData.apiBaseUrl = cleanupValue(credentials.apiBaseUrl ?? null);
        integrationData.apiKey = cleanupValue(credentials.apiKey ?? null);
        integrationData.apiAuthType = integrationData.apiKey ? 'API_KEY' : null;
      }

      await tx.vendorIntegration.create({ data: integrationData });

      return vendor.id;
    });

    const created = await db.vendor.findUnique({
      where: { id: vendorId },
      include: { integration: true },
    });

    if (!created) {
      throw new Error('Vendor blev ikke fundet efter oprettelse');
    }

    return NextResponse.json({ ok: true, vendor: formatVendor(created) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/catalog/vendor-sync/vendors] failed to create vendor', { err: message });
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: 'Kunne ikke oprette leverandør' },
      { status: 500 },
    );
  }
}
