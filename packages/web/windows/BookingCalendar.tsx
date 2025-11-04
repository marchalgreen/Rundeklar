// src/windows/BookingCalendar.tsx
'use client';

import CalendarWindow from '@/components/calendar/CalendarWindow';

export const BOOKING_CALENDAR_TYPE = 'booking_calendar';

export default function BookingCalendar() {
  return (
    <div className="h-full w-full">
      <CalendarWindow />
    </div>
  );
}
