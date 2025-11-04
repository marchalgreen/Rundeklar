import { NextResponse } from 'next/server';
import { COOKIE, delCookie } from '@/lib/auth/cookies';

export async function POST() {
  await delCookie(COOKIE.EMP);
  // Play minimal logout transition overlay before navigating back to login
  return NextResponse.json({ ok: true, next: '/login' });
}
