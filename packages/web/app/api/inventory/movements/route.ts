// TODO(typing): Imports outdated model types; align to current schema and remove.
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const storeStockId = url.searchParams.get('storeStockId') ?? '';

    const parsedDays = Number(url.searchParams.get('days'));
    const daysBase = Number.isFinite(parsedDays) ? parsedDays : 30;
    const days = Math.max(1, Math.min(90, Math.trunc(daysBase)));

    if (!storeStockId) {
      return NextResponse.json({ ok: false, error: 'Missing storeStockId' }, { status: 400 });
    }

    const client = await prisma;
    const row = await client.storeStock.findUnique({
      where: { id: storeStockId },
      select: { storeId: true, productId: true, id: true },
    });

    if (!row) {
      return NextResponse.json({ ok: true, entries: [] });
    }

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const list = await client.stockMovement.findMany({
      where: { storeId: row.storeId, productId: row.productId, at: { gte: since } },
      orderBy: { at: 'desc' },
      take: 1000,
    });

    // 👇 Type the callback arg without importing Prisma model types
    const entries = list.map((movement: (typeof list)[number]) => ({
      id: movement.id,
      itemId: storeStockId,
      qtyBefore: movement.qtyBefore,
      qtyAfter: movement.qtyAfter,
      delta: movement.delta,
      reason: movement.reason ?? 'Correction',
      note: movement.note ?? undefined,
      atISO: movement.at.toISOString(),
    }));

    return NextResponse.json({ ok: true, entries });
  } catch (e: any) {
    const message = String(e?.message ?? e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
