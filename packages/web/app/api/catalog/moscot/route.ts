import { NextRequest, NextResponse } from 'next/server';

import type { VendorCatalogItem, VendorSyncState } from '@prisma/client';

import { loadMoscotCatalog, MOSCOT_VENDOR } from '@/lib/catalog/moscotSync';
import { prisma } from '@/lib/db';
import type { CatalogProduct } from '@/types/product';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatSyncMeta(state: {
  lastRunAt: Date | null;
  lastSource: string | null;
  totalItems: number;
  lastDurationMs: number | null;
  lastHash: string | null;
  lastRunBy: string | null;
  lastError: string | null;
} | null) {
  if (!state) return null;
  return {
    lastRunAt: state.lastRunAt ? state.lastRunAt.toISOString() : null,
    lastSource: state.lastSource,
    totalItems: state.totalItems,
    lastDurationMs: state.lastDurationMs,
    hash: state.lastHash,
    lastRunBy: state.lastRunBy,
    lastError: state.lastError,
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qpPath = url.searchParams.get('path');

    if (qpPath && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'query path forbidden in production' }, { status: 400 });
    }

    if (qpPath) {
      const { products, sourcePath } = await loadMoscotCatalog({ explicitPath: qpPath });
      return NextResponse.json({
        vendor: MOSCOT_VENDOR,
        source: 'file',
        sourcePath,
        products,
        sync: null,
      });
    }

    const client = await prisma;
    const items = (await client.vendorCatalogItem.findMany({
      where: { vendor: MOSCOT_VENDOR },
      orderBy: { catalogId: 'asc' },
    })) as VendorCatalogItem[];
    const syncState = (await client.vendorSyncState.findUnique({
      where: { vendor: MOSCOT_VENDOR },
    })) as VendorSyncState | null;

    if (items.length > 0) {
      const products = items.map((row) => row.payload as CatalogProduct);
      return NextResponse.json({
        vendor: MOSCOT_VENDOR,
        source: 'db',
        sourcePath: syncState?.lastSource ?? null,
        products,
        sync: formatSyncMeta(
          syncState
            ? {
                lastRunAt: syncState.lastRunAt ?? null,
                lastSource: syncState.lastSource ?? null,
                totalItems: syncState.totalItems,
                lastDurationMs: syncState.lastDurationMs ?? null,
                lastHash: syncState.lastHash ?? null,
                lastRunBy: syncState.lastRunBy ?? null,
                lastError: syncState.lastError ?? null,
              }
            : null,
        ),
      });
    }

    const { products, sourcePath } = await loadMoscotCatalog();
    return NextResponse.json({
      vendor: MOSCOT_VENDOR,
      source: 'file',
      sourcePath,
      products,
      sync: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/catalog/moscot] read error', {
      error: message,
    });
    return NextResponse.json(
      { error: 'cannot read catalog', detail: message },
      { status: 500 },
    );
  }
}
