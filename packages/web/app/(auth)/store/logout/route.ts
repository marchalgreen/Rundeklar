import { NextResponse } from 'next/server';
import { COOKIE, delCookie } from '@/lib/auth/cookies';

export async function POST() {
  await delCookie(COOKIE.STORE);
  await delCookie(COOKIE.EMP);
  return NextResponse.json({ ok: true, next: '/auth/store/login' });
}
