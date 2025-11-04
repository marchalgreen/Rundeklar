import { SignJWT } from 'jose';

const SERVICE_SECRET = new TextEncoder().encode(
  process.env.SERVICE_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'service-dev-secret-change-me',
);

export async function createServiceJwt(scopes: string | string[]) {
  const scopeList = Array.isArray(scopes) ? scopes : [scopes];
  return new SignJWT({ scopes: scopeList, sub: 'service-test', aud: 'clairity-services' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(SERVICE_SECRET);
}
