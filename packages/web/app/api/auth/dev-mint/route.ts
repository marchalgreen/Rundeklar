export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth/jwt';
import { COOKIE, setCookie } from '@/lib/auth/cookies';

async function mint() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'disabled_in_production' }, { status: 403 });
  }
  const sid = crypto.randomUUID();
  const jwt = await signJwt({ sid, storeId: 'store-1', role: 'owner' }, 60 * 60 * 8);
  await setCookie(COOKIE.STORE, jwt, 60 * 60 * 8);
  return NextResponse.json({ ok: true, next: '/auth/login' });
}

export async function POST() {
  return mint();
}

// 👇 add GET so Playwright can `page.goto('/api/auth/dev-mint')`
export async function GET() {
  return mint();
}
