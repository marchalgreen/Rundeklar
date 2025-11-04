import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AlertPayload = {
  level: 'info' | 'warn' | 'error';
  message: string;
  vendors?: string[];
};

function normalizePayload(input: unknown): AlertPayload | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const level = typeof raw.level === 'string' ? raw.level.trim().toLowerCase() : '';
  if (level !== 'info' && level !== 'warn' && level !== 'error') return null;

  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  if (!message) return null;

  let vendors: string[] | undefined;
  if (Array.isArray(raw.vendors)) {
    vendors = raw.vendors
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
  }

  return { level, message, vendors } satisfies AlertPayload;
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const normalized = normalizePayload(payload);
  if (!normalized) {
    return NextResponse.json(
      { ok: false, error: 'invalid_payload', detail: 'Expected { level, message }' },
      { status: 400 },
    );
  }

  const context = normalized.vendors?.length ? { vendors: normalized.vendors } : undefined;
  const prefix = normalized.level.toUpperCase();
  console.log(`[vendor-sync-alerts] ${prefix} ${normalized.message}`, context);

  const response = {
    ok: true,
    received: normalized,
    toast: {
      title:
        normalized.level === 'error'
          ? 'Fejl i vendor sync'
          : normalized.level === 'warn'
            ? 'Vendor sync opmærksomhed'
            : 'Vendor sync besked',
      description: normalized.message,
      tone: normalized.level,
    },
  } as const;

  return NextResponse.json(response);
}

