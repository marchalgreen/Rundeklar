import { cookies as _cookies } from 'next/headers';

export const COOKIE = {
  STORE: 'STORE_SESS',
  EMP: 'EMP_SESS',
  PENDING: 'STORE_PENDING',
} as const;

export async function setCookie(name: string, value: string, maxAgeSec: number) {
  const cookies = await _cookies();
  cookies.set(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export async function delCookie(name: string) {
  const cookies = await _cookies();
  cookies.set(name, '', { maxAge: 0, path: '/' });
}

export async function getCookie(name: string) {
  const cookies = await _cookies();
  return cookies.get(name)?.value ?? null;
}
