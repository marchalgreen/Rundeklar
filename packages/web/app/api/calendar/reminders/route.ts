// src/app/api/calendar/reminders/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { eventId, channels } = await req.json();
  const now = new Date().toISOString();
  return NextResponse.json([
    {
      id: 'rem_' + Math.random().toString(36).slice(2, 8),
      eventId,
      channel: channels[0],
      when: now,
      status: 'queued',
    },
  ]);
}
