// src/app/api/calendar/availability/route.ts
import { NextResponse } from 'next/server';

export async function GET(_req: Request) {
  // quick stub: return dummy staff availability
  return NextResponse.json({
    staff: [
      {
        id: 'stf_001',
        name: 'Demo Staff',
        role: 'optometrist',
        businessHours: {
          mon: [['08:00', '16:00']],
          tue: [['08:00', '16:00']],
          wed: [['08:00', '16:00']],
          thu: [['08:00', '16:00']],
          fri: [['08:00', '14:00']],
          sat: [],
          sun: [],
        },
      },
    ],
  });
}
