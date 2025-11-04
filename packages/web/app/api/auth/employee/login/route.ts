export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verify } from '@node-rs/argon2';
import { getPrisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const prisma = await getPrisma();
  const { employeeSlug, pin } = await req.json();
  if (!employeeSlug || !pin) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const c = await cookies(); // 👈 await is required in Next 15
  const storeSessId = c.get('STORE_SESS')?.value;
  if (!storeSessId) {
    return NextResponse.json({ ok: false, error: 'no_store_session' }, { status: 401 });
  }

  const storeSess = await prisma.session.findUnique({ where: { id: storeSessId } });
  if (!storeSess || storeSess.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 401 });
  }

  const emp = await prisma.employee.findUnique({
    where: { slug_storeId: { slug: employeeSlug, storeId: storeSess.storeId } },
  });
  if (!emp) {
    return NextResponse.json({ ok: false, error: 'no_employee' }, { status: 404 });
  }

  const ok = await verify(emp.pinHash, pin);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'invalid_pin' }, { status: 401 });
  }

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 4); // 4 hours
  const empSess = await prisma.session.create({
    data: { storeId: storeSess.storeId, employeeId: emp.id, expiresAt: expires },
  });

  c.set('EMP_SESS', empSess.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });

  return NextResponse.json({ ok: true, next: '/' });
}
