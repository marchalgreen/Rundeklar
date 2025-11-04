import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET || 'dev-secret-change-me');

export type StoreSess = {
  sid: string;
  storeId: string;
  role: 'owner' | 'manager';
  iat?: number;
  exp?: number;
};
export type EmpSess = {
  sid: string;
  storeId: string;
  employeeId: string;
  employeeSlug: string;
  iat?: number;
  exp?: number;
};

export async function signJwt<T extends JWTPayload>(payload: T, ttlSec: number) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret);
}

export async function verifyJwt<T extends JWTPayload>(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as T;
}
