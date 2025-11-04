import 'dotenv/config';
import { SignJWT } from 'jose';

// Use the same secret the server verifies with
const secret = new TextEncoder().encode(
  process.env.SERVICE_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'service-dev-secret-change-me',
);

// Keep audience in sync with serviceToken.ts (DEFAULT_AUDIENCE)
const AUD = process.env.SERVICE_JWT_AUDIENCE || 'clairity-services';

async function mint(scopes: string[] | string, ttlSec = 300) {
  const scopeValue = Array.isArray(scopes) ? scopes : String(scopes);
  const token = await new SignJWT({ sub: 'service', scopes: scopeValue, aud: AUD })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret);
  console.log(token);
}

// usage: pnpm tsx scripts/mint-service-token.ts read|write [ttlSec] | custom1,custom2
const kind = (process.argv[2] || 'read').toLowerCase();
const ttl = Number(process.argv[3]) || 300;

if (kind === 'read') mint(['catalog:sync:read'], ttl);
else if (kind === 'write') mint(['catalog:sync:write'], ttl);
else mint(kind.split(','), ttl);
