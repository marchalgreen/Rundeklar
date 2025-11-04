export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPrisma } from '@/lib/db';
import { verify } from '@node-rs/argon2';

export async function POST(req: Request) {
  const prisma = await getPrisma();
  const { code } = await req.json();
  if (!/^[0-9]{6}$/.test(code || '')) {
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 400 });
  }

  const c = await cookies();
  const raw = c.get('STORE_PENDING')?.value;
  if (!raw) return NextResponse.json({ ok: false, error: 'no_pending' }, { status: 401 });

  let pending: { storeId: string; exp: number; codeHash?: string; tries?: number } | null = null;
  try {
    pending = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_pending' }, { status: 400 });
  }

  if (!pending?.storeId || !pending?.exp || pending.exp < Date.now()) {
    c.set('STORE_PENDING', '', { maxAge: 0, path: '/' });
    return NextResponse.json({ ok: false, error: 'pending_expired' }, { status: 401 });
  }

  if (!pending.codeHash) {
    return NextResponse.json({ ok: false, error: 'no_code_sent' }, { status: 400 });
  }

  const ok = await verify(pending.codeHash, code);
  if (!ok) {
    const tries = (pending.tries ?? 0) + 1;
    if (tries >= 5) {
      c.set('STORE_PENDING', '', { maxAge: 0, path: '/' });
      return NextResponse.json({ ok: false, error: 'too_many_attempts' }, { status: 429 });
    }
    const nextPending = { ...pending, tries };
    c.set('STORE_PENDING', JSON.stringify(nextPending), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.max(1, Math.floor((pending.exp - Date.now()) / 1000)),
    });
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 401 });
  }

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180); // 180 days
  const session = await prisma.session.create({
    data: { storeId: pending.storeId, employeeId: null, expiresAt: expires },
  });

  c.set('STORE_PENDING', '', { maxAge: 0, path: '/' });
  c.set('STORE_SESS', session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });

  return NextResponse.json({ ok: true, next: '/login' });
}
