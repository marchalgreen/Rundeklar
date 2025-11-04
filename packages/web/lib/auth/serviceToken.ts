// src/lib/auth/serviceToken.ts
import { jwtVerify, SignJWT } from 'jose';
import type { JWTPayload } from 'jose';
import type { NextRequest } from 'next/server';

/**
 * Use a single secret across mint + verify.
 * Prefer SERVICE_JWT_SECRET; fall back to AUTH_JWT_SECRET for compatibility.
 */
const SERVICE_SECRET = new TextEncoder().encode(
  process.env.SERVICE_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'service-dev-secret-change-me',
);

const DEFAULT_AUDIENCE = process.env.SERVICE_JWT_AUDIENCE || 'clairity-services';

export type ServiceJwtClaims = JWTPayload & {
  sub?: string;
  aud?: string | string[];
  scopes?: string[] | string;
};

export type VerifiedServiceJwt = ServiceJwtClaims & {
  scopes: string[]; // normalized to array
};

export class ServiceAuthError extends Error {
  status: number;
  code: 'missing_token' | 'invalid_token' | 'forbidden';

  constructor(message: string, status: number, code: ServiceAuthError['code']) {
    super(message);
    this.name = 'ServiceAuthError';
    this.status = status;
    this.code = code;
  }
}

/** Normalize scopes to an array of strings */
function normalizeScopes(scopes: ServiceJwtClaims['scopes']): string[] {
  if (!scopes) return [];
  if (Array.isArray(scopes)) return scopes.map((s) => String(s));
  if (typeof scopes === 'string') {
    return scopes
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function hasRequiredScope(scopes: string[], required?: string | string[]): boolean {
  if (!required) return true;
  const req = Array.isArray(required) ? required : [required];
  return req.every((r) => scopes.includes(r));
}

function audienceMatches(aud?: string | string[], expected?: string): boolean {
  if (!expected) return true;
  if (!aud) return false;
  if (Array.isArray(aud)) return aud.includes(expected);
  return aud === expected;
}

/**
 * Verify a service JWT. Throws ServiceAuthError on auth issues.
 */
export async function verifyServiceJwt(
  token: string,
  opts: { audience?: string; scope?: string | string[] } = {},
): Promise<VerifiedServiceJwt> {
  const { payload } = await jwtVerify(token, SERVICE_SECRET);
  const claims = payload as ServiceJwtClaims;
  const scopes = normalizeScopes(claims.scopes);

  if (!audienceMatches(claims.aud, opts.audience || DEFAULT_AUDIENCE)) {
    throw new ServiceAuthError('Service token audience mismatch', 403, 'forbidden');
  }

  if (!hasRequiredScope(scopes, opts.scope)) {
    throw new ServiceAuthError('Service token missing required scope', 403, 'forbidden');
  }

  return { ...claims, scopes };
}

/**
 * Extract Bearer (or x-service-token) from a NextRequest.
 */
function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (header && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, '').trim();
  }
  const alt = req.headers.get('x-service-token');
  return alt ? alt.trim() : null;
}

/**
 * Require & validate a service JWT from a request.
 */
export async function requireServiceJwt(
  req: NextRequest,
  opts: { audience?: string; scope?: string | string[] } = {},
): Promise<VerifiedServiceJwt> {
  const token = extractBearer(req);
  if (!token) {
    throw new ServiceAuthError('Service token missing', 401, 'missing_token');
  }
  try {
    return await verifyServiceJwt(token, opts);
  } catch (err) {
    if (err instanceof ServiceAuthError) throw err;
    throw new ServiceAuthError('Service token invalid', 401, 'invalid_token');
  }
}

/**
 * Optional helper: sign a short-lived service JWT (useful for tests/CLI).
 * NOTE: prefer the dedicated scripts/mint-service-token.ts in real usage.
 */
export async function signServiceJwt(
  scopes: string[] | string,
  ttlSec = 300,
  audience = DEFAULT_AUDIENCE,
) {
  const scopeValue = Array.isArray(scopes) ? scopes : String(scopes);
  return await new SignJWT({ sub: 'service', scopes: scopeValue, aud: audience })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(SERVICE_SECRET);
}
