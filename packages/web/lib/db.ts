// src/lib/db.ts

// IMPORTANT:
// - We only disable DB access when running Playwright locally (PLAYWRIGHT=1).
// - Do NOT key on CI=1, because Vercel sets CI=1 during production builds.

const IS_E2E = process.env.PLAYWRIGHT === '1';

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: any | undefined;
}

let prismaPromise: Promise<any> | null = null;

async function loadPrismaClient() {
  if (IS_E2E) {
    // Minimal no-op shim so server routes render without touching a DB in e2e.
    // Any actual query will throw clearly.
    const noop = async () => {};
    return new Proxy(
      { $disconnect: noop },
      {
        get(_target, prop) {
          if (prop === '$disconnect') return noop;
          return async () => {
            throw new Error('DB disabled in e2e');
          };
        },
      },
    );
  }

  // Lazy-load the real Prisma client at runtime
  const prismaPkg: any = await import('@prisma/client');
  const PrismaClient = prismaPkg.PrismaClient || prismaPkg.default || prismaPkg;
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export async function getPrisma() {
  if (globalThis.__PRISMA__) return globalThis.__PRISMA__;
  prismaPromise ??= loadPrismaClient().then((client) => {
    globalThis.__PRISMA__ = client;
    return client;
  });
  return prismaPromise;
}

export type PrismaClient = Awaited<ReturnType<typeof getPrisma>>;

// Preferred aliases elsewhere in the codebase
export const prisma = getPrisma();
export const db = prisma;
