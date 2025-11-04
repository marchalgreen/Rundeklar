// src/app/api/calendar/events/route.ts
import { NextResponse } from 'next/server';

export async function GET(_req: Request) {
  // quick stub: always return an empty array
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const body = await req.json();
  // return body with a fake id
  return NextResponse.json({ ...body, id: 'evt_' + Math.random().toString(36).slice(2, 8) });
}
