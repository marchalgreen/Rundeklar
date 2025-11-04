import { NextResponse } from 'next/server';

import { calendarOpenAPI } from '@/lib/docs/calendarOpenAPI';

export function GET() {
  return NextResponse.json(calendarOpenAPI, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
