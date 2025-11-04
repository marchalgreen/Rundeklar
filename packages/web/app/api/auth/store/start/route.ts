export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verify } from '@node-rs/argon2';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

const DISABLE_DB = process.env.DISABLE_DB === '1' || !process.env.DATABASE_URL;

/**
 * Step 1: Owner enters email + password.
 * - On success, we set a short-lived PENDING cookie (no session yet).
 * - Frontend redirects to /store/verify-2fa
 */
export async function POST(req: Request) {
  if (DISABLE_DB) {
    return NextResponse.json({ ok: false, error: 'db_disabled' }, { status: 503 });
  }

  try {
    const { email, password } = await req.json();
    const client = await prisma;
    const store = await client.store.findUnique({ where: { email } });
    if (!store) {
      return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }

    const ok = await verify(store.password, password);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }

    // Set a short-lived PENDING cookie (5 minutes). We only store storeId + exp.
    const pending = {
      storeId: store.id,
      exp: Date.now() + 1000 * 60 * 5,
    };

    const c = await cookies();
    c.set('STORE_PENDING', JSON.stringify(pending), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 5, // 5 minutes
    });

    return NextResponse.json({ ok: true, next: '/store/verify-2fa' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
  }
}
