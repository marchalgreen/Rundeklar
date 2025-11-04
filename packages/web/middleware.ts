import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = [
  '/store/login',
  '/store/verify-2fa',
  '/login',
  '/api/auth/store/start',
  '/api/auth/store/send-code',
  '/api/auth/store/verify-2fa',
  '/api/auth/employee/login',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/dev-mint',
] as const;

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (
    PUBLIC.some((p) => path.startsWith(p)) ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/public') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|json|woff2?|ttf|eot)$/i.test(path)
  ) {
    return NextResponse.next();
  }

  const storeSess = req.cookies.get('STORE_SESS')?.value;
  if (!storeSess) {
    const login = new URL('/store/login', req.url);
    return NextResponse.redirect(login);
  }

  const empSess = req.cookies.get('EMP_SESS')?.value;
  if (!empSess && (path === '/' || path.startsWith('/app'))) {
    const pin = new URL('/login', req.url);
    return NextResponse.redirect(pin);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
