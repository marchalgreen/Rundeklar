import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

function assertDev() {
  if (process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }
}

function getSecret(): Uint8Array {
  const raw = process.env.SERVICE_JWT_SECRET || process.env.STACK_SECRET_SERVER_KEY || 'dev-secret';
  return new TextEncoder().encode(raw);
}

type MintOptions = {
  scopes?: string[];
  aud?: string; // 👈 allow audience override
  iss?: string;
  sub?: string;
  ttl?: string; // e.g. "15m"
};

async function mint(opts: MintOptions = {}) {
  const secret = getSecret();

  const scopes = opts.scopes?.length ? opts.scopes : ['catalog:sync:write'];
  // 👇 default audience to the one your verifier/tests use
  const aud = opts.aud || process.env.SERVICE_JWT_AUDIENCE || 'clairity-services';
  const iss = opts.iss || process.env.SERVICE_JWT_ISSUER || 'clairity-dev';
  const sub = opts.sub || 'service-dev-mint';
  const ttl = opts.ttl || '15m';

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15 * 60; // keep simple for dev; TTL string is ignored for now

  // emit both 'scopes' and 'scope' to be flexible
  const payload = {
    scopes,
    scope: scopes.join(' '),
    sub,
    iss,
    aud,
    iat: now,
    exp,
  } as const;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return { token, expiresAt: exp, scopes, aud, iss, sub };
}

export async function GET() {
  try {
    assertDev();
    const res = await mint();
    return NextResponse.json(
      { ok: true, ...res },
      { headers: { 'cache-control': 'no-store', 'x-service-jwt': res.token } },
    );
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    const detail = err instanceof Error ? err.message : 'Unable to mint dev service JWT';
    return NextResponse.json({ ok: false, error: 'dev_mint_failed', detail }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertDev();
    const body = (await req.json().catch(() => ({}))) as MintOptions;
    const res = await mint(body);
    return NextResponse.json(
      { ok: true, ...res },
      { headers: { 'cache-control': 'no-store', 'x-service-jwt': res.token } },
    );
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    const detail = err instanceof Error ? err.message : 'Unable to mint dev service JWT';
    return NextResponse.json({ ok: false, error: 'dev_mint_failed', detail }, { status });
  }
}
