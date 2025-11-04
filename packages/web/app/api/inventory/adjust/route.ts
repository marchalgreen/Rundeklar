export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : null;
    const deltaRaw = Number(body?.delta);
    const reason = typeof body?.reason === 'string' ? body.reason : undefined;
    const note = typeof body?.note === 'string' ? body.note : undefined;
    void reason;
    void note;
    if (!id || !Number.isFinite(deltaRaw)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }
    const delta = Math.trunc(deltaRaw);

    const client = await prisma;
    const updated = await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.storeStock.findUnique({ where: { id } });
      if (!row) throw new Error('Not found');

      const nextQty = Math.max(0, row.qty + delta);
      const saved = await tx.storeStock.update({
        where: { id },
        data: { qty: nextQty, updatedAt: new Date() },
      });
      return saved;
    });

    return NextResponse.json({
      ok: true,
      id: updated.id,
      qty: updated.qty,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = /not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
