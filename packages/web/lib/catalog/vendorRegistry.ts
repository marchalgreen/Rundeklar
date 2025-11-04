// src/lib/catalog/vendorRegistry.ts

import type { Prisma, VendorSyncState } from '@prisma/client';
import { prisma } from '@/lib/db';

import { loadMoscotCatalog } from './moscotSync';
import { DEFAULT_VENDOR_SLUG, normalizeVendorSlug, resolveVendorSlug } from './vendorSlugs';

/**
 * The current Prisma schema does not define Vendor/VendorIntegration/IntegrationType.
 * We keep the runtime calls (db.vendor / include: { integration: true }) for backward
 * compatibility and cast results to these local shapes to keep typecheck happy.
 */
export type IntegrationType = 'SCRAPER' | 'API';

export type VendorIntegrationLite = {
  id: string;
  type: IntegrationType;
  scraperPath?: string | null;
  apiBaseUrl?: string | null;
  apiAuthType?: string | null;
  apiKey?: string | null;
  lastTestAt?: Date | null;
  lastTestOk?: boolean | null;
  meta?: unknown | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type VendorLite = {
  id: string;
  slug: string;
  name: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  integration: VendorIntegrationLite | null;
};

type PrismaClient = Awaited<typeof prisma>;

export type VendorWithIntegration = VendorLite;

export type SerializedVendorIntegration = {
  id: string;
  type: IntegrationType;
  scraperPath: string | null;
  apiBaseUrl: string | null;
  apiAuthType: string | null;
  apiKey: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  error: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedVendor = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  integration: SerializedVendorIntegration | null;
  state: SerializedVendorState | null;
};

export type SerializedVendorState = {
  vendor: string;
  lastRunAt: string | null;
  totalItems: number | null;
  lastError: string | null;
  lastDurationMs: number | null;
  lastHash: string | null;
  lastSource: string | null;
  lastRunBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getPrismaClient(client?: PrismaClient): Promise<PrismaClient> {
  if (client) return client;
  return (await prisma) as PrismaClient;
}

export async function listVendors(client?: PrismaClient): Promise<VendorWithIntegration[]> {
  const db = await getPrismaClient(client);
  // Runtime shape is repo-specific; cast to our lite type.
  const rows = (await db.vendor?.findMany?.({
    orderBy: { slug: 'asc' },
    include: { integration: true },
  })) as unknown as VendorWithIntegration[] | undefined;

  return rows ?? [];
}

export async function getVendorBySlug(
  slug: string,
  client?: PrismaClient,
): Promise<VendorWithIntegration | null> {
  const db = await getPrismaClient(client);
  const normalized = normalizeVendorSlug(slug);
  if (!normalized) return null;

  const row = (await db.vendor?.findUnique?.({
    where: { slug: normalized },
    include: { integration: true },
  })) as unknown as VendorWithIntegration | undefined;

  return row ?? null;
}

type ConnectionTestOptions = {
  sourcePathOverride?: string | null;
};

const IntegrationTypeScraper: IntegrationType = 'SCRAPER';
const IntegrationTypeApi: IntegrationType = 'API';

type ConnectionTestSuccessMeta = {
  sourcePath?: string;
  totalItems?: number;
};

type ConnectionTestFailureMeta = {
  error: string;
};

export type ConnectionTestMeta = ConnectionTestSuccessMeta | ConnectionTestFailureMeta;

export type ConnectionTestResult = {
  ok: boolean;
  vendor: string;
  vendorName: string;
  integrationId: string;
  type: IntegrationType;
  checkedAt: string;
  meta: ConnectionTestMeta;
};

function toJson(value: ConnectionTestMeta): Prisma.JsonValue {
  return value as Prisma.JsonValue;
}

async function testScraperConnection(
  vendor: VendorWithIntegration,
  options: ConnectionTestOptions,
): Promise<ConnectionTestResult> {
  const integration = vendor.integration;
  if (!integration) {
    throw new Error(`Vendor ${vendor.slug} does not have an integration configured`);
  }

  const explicitPath = options.sourcePathOverride ?? integration.scraperPath ?? undefined;

  if (vendor.slug !== DEFAULT_VENDOR_SLUG) {
    throw new Error(`Scraper connection testing not implemented for vendor ${vendor.slug}`);
  }

  const { products, sourcePath } = await loadMoscotCatalog({ explicitPath });

  const meta: ConnectionTestSuccessMeta = {
    sourcePath,
    totalItems: products.length,
  };

  const now = new Date();

  return {
    ok: true,
    vendor: vendor.slug,
    vendorName: vendor.name,
    integrationId: integration.id,
    type: integration.type,
    checkedAt: now.toISOString(),
    meta,
  };
}

export async function testVendorIntegration(
  slug: string,
  options: ConnectionTestOptions = {},
  client?: PrismaClient,
): Promise<ConnectionTestResult> {
  const db = await getPrismaClient(client);
  const vendorSlug = resolveVendorSlug(slug);
  const vendor = await getVendorBySlug(vendorSlug, db);

  if (!vendor || !vendor.integration) {
    throw new Error(`Vendor ${vendorSlug} is not configured`);
  }

  let result: ConnectionTestResult;
  try {
    if (vendor.integration.type === IntegrationTypeScraper) {
      result = await testScraperConnection(vendor, options);
    } else if (vendor.integration.type === IntegrationTypeApi) {
      throw new Error(`API connection testing not implemented for vendor ${vendor.slug}`);
    } else {
      throw new Error(`Unsupported integration type ${vendor.integration.type}`);
    }

    await db.vendorIntegration?.update?.({
      where: { id: vendor.integration.id },
      data: {
        lastTestAt: new Date(result.checkedAt),
        lastTestOk: true,
        meta: toJson(result.meta),
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failure: ConnectionTestResult = {
      ok: false,
      vendor: vendor.slug,
      vendorName: vendor.name,
      integrationId: vendor.integration.id,
      type: vendor.integration.type,
      checkedAt: new Date().toISOString(),
      meta: { error: message },
    };

    await db.vendorIntegration?.update?.({
      where: { id: vendor.integration.id },
      data: {
        lastTestAt: new Date(failure.checkedAt),
        lastTestOk: false,
        meta: toJson(failure.meta),
      },
    });

    return failure;
  }
}

function serializeDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function formatVendorState(
  state: VendorSyncState | null | undefined,
): SerializedVendorState | null {
  if (!state) return null;
  return {
    vendor: state.vendor,
    lastRunAt: serializeDate(state.lastRunAt ?? null),
    totalItems: typeof state.totalItems === 'number' ? state.totalItems : null,
    lastError: state.lastError ?? null,
    lastDurationMs: typeof state.lastDurationMs === 'number' ? state.lastDurationMs : null,
    lastHash: state.lastHash ?? null,
    lastSource: state.lastSource ?? null,
    lastRunBy: state.lastRunBy ?? null,
    createdAt: serializeDate(state.createdAt ?? null),
    updatedAt: serializeDate(state.updatedAt ?? null),
  };
}

export function formatVendor(
  vendor: VendorWithIntegration,
  opts?: { state?: VendorSyncState | null },
): SerializedVendor {
  const integration = vendor.integration
    ? ({
        id: vendor.integration.id,
        type: vendor.integration.type,
        scraperPath: vendor.integration.scraperPath ?? null,
        apiBaseUrl: vendor.integration.apiBaseUrl ?? null,
        apiAuthType: vendor.integration.apiAuthType ?? null,
        apiKey: vendor.integration.apiKey ?? null,
        lastTestAt: serializeDate(vendor.integration.lastTestAt ?? null),
        lastTestOk: vendor.integration.lastTestOk ?? null,
        error:
          vendor.integration.meta &&
          typeof vendor.integration.meta === 'object' &&
          'error' in (vendor.integration.meta as any) &&
          typeof (vendor.integration.meta as any).error === 'string'
            ? ((vendor.integration.meta as any).error as string)
            : null,
        meta: (vendor.integration.meta as Record<string, unknown> | null) ?? null,
        createdAt: serializeDate(vendor.integration.createdAt ?? null) ?? new Date().toISOString(),
        updatedAt: serializeDate(vendor.integration.updatedAt ?? null) ?? new Date().toISOString(),
      } satisfies SerializedVendorIntegration)
    : null;

  return {
    id: vendor.id,
    slug: vendor.slug,
    name: vendor.name,
    createdAt: serializeDate(vendor.createdAt ?? null) ?? new Date().toISOString(),
    updatedAt: serializeDate(vendor.updatedAt ?? null) ?? new Date().toISOString(),
    integration,
    state: formatVendorState(opts?.state ?? null),
  };
}

export function formatVendorStateSnapshot(
  state: VendorSyncState | null | undefined,
): SerializedVendorState | null {
  return formatVendorState(state);
}
