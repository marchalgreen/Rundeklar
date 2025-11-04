export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { vendorSyncOpenAPI } from '@/lib/docs/vendorSyncOpenAPI';

export async function GET() {
  return NextResponse.json(vendorSyncOpenAPI, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
