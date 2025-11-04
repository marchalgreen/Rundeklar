// src/app/api/calendar/events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

type MemEvent = {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  staffId: string;
  customerId: string;
  status: string;
  serviceType: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  [key: string]: unknown;
};

type ParamsCtx = { params: Promise<{ id: string }> };

const mem: Record<string, MemEvent> = {};

export async function PATCH(req: NextRequest, ctx: ParamsCtx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<MemEvent>;

  const existing = mem[id] ?? {
    id,
    title: 'Ny aftale', // normalized
    start: new Date().toISOString(),
    end: new Date(Date.now() + 30 * 60000).toISOString(),
    staffId: 'stf_001',
    customerId: 'cst_001',
    status: 'booked',
    serviceType: 'eyeexam',
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
  mem[id] = updated;
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: ParamsCtx) {
  const { id } = await ctx.params;
  delete mem[id];
  return NextResponse.json({ ok: true });
}
