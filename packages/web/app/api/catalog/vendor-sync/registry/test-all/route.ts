import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireServiceJwt, ServiceAuthError } from '@/lib/auth/serviceToken';
import {
  getPrismaClient,
  listVendors,
  testVendorIntegration,
  type VendorWithIntegration,
} from '@/lib/catalog/vendorRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FailureEntry = { slug: string; error: string };

function formatFailureError(meta: unknown, fallback: string): string {
  if (meta && typeof meta === 'object' && 'error' in meta) {
    const value = (meta as { error?: unknown }).error;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function makeErrorResponse(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

function hasIntegration(vendor: VendorWithIntegration): boolean {
  return Boolean(vendor.integration);
}

async function runConcurrently<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const concurrency = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
  if (tasks.length === 0) return [];
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    const index = cursor;
    if (index >= tasks.length) return;
    cursor += 1;

    const task = tasks[index];
    results[index] = await task();
    await worker();
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  try {
    await requireServiceJwt(req, { scope: 'catalog:sync:write' });
  } catch (err) {
    if (err instanceof ServiceAuthError) {
      const code = err.code === 'forbidden' ? 'insufficient_scope' : err.code;
      return makeErrorResponse(err.status, code, err.message);
    }
    const detail = err instanceof Error ? err.message : String(err);
    return makeErrorResponse(401, 'invalid_token', detail);
  }

  try {
    const db = await getPrismaClient();
    const vendors = await listVendors(db);
    const candidates = vendors.filter(hasIntegration);

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        tested: 0,
        passed: 0,
        failed: 0,
        failures: [] as FailureEntry[],
      });
    }

    const results = await runConcurrently(
      candidates.map((vendor) => async () => {
        try {
          return await testVendorIntegration(vendor.slug, {}, db);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            ok: false as const,
            vendor: vendor.slug,
            meta: { error: message },
          };
        }
      }),
      5,
    );

    let passed = 0;
    let failed = 0;
    const failures: FailureEntry[] = [];

    for (const result of results) {
      if (result?.ok) {
        passed += 1;
      } else {
        failed += 1;
        const error = formatFailureError(result?.meta, 'Ukendt fejl');
        failures.push({ slug: result?.vendor ?? 'ukendt', error });
      }
    }

    return NextResponse.json({
      ok: true,
      tested: results.length,
      passed,
      failed,
      failures,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[api/catalog/vendor-sync/registry/test-all] failed', { err: detail });
    return NextResponse.json(
      { ok: false, error: 'failed_to_test_integrations', detail },
      { status: 500 },
    );
  }
}
