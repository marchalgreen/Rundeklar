export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { Product, StoreStock } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const client = await prisma;
    const store = await client.store.findFirst();
    if (!store) return NextResponse.json({ items: [], storeId: null });

    const rows = await client.storeStock.findMany({
      where: { storeId: store.id },
      include: { product: true },
      take: 800,
    });

    const items = rows.map((r: StoreStock & { product: Product }) => ({
      id: r.id,
      sku: r.product.sku,
      name: r.product.name,
      category: r.product.category,
      qty: r.qty,
      barcode: r.barcode || undefined,
      updatedAt: r.updatedAt.toISOString(),
      brand: r.product.brand || undefined,
      model: r.product.model || undefined,
      color: r.product.color || undefined,
      sizeLabel: r.product.sizeLabel || undefined,
      usage: (r.product.usage as 'optical' | 'sun' | 'both' | undefined) || undefined,
    }));

    return NextResponse.json({ items, storeId: store.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
