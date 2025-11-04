// src/components/calendar/MonthGrid.tsx
'use client';

import React, { useEffect, useMemo } from 'react';
import { useCalendar, type Event, type StaffId } from '@/store/calendar';
import MonthDayCell from './MonthDayCell';

const WEEK_ROWS = 6;
const COLS = 7;

function startOfMonth(d: Date) {
  const c = new Date(d);
  c.setDate(1);
  c.setHours(0, 0, 0, 0);
  return c;
}
function startOfWeekMonday(d: Date) {
  const c = new Date(d);
  const dow = (c.getDay() + 6) % 7; // 0 = Monday
  c.setDate(c.getDate() - dow);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function MonthGridComponent({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) {
  const { dateISO, events, staff } = useCalendar();

  const base = useMemo(() => new Date(dateISO), [dateISO]);
  const monthStart = useMemo(() => startOfMonth(base), [base]);
  const gridStart = useMemo(() => startOfWeekMonday(monthStart), [monthStart]);

  const days = useMemo(() => {
    return Array.from({ length: WEEK_ROWS * COLS }, (_, i) => addDays(gridStart, i));
  }, [gridStart]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const d of days) {
      const key = d.toDateString();
      map[key] = Object.values(events).filter((ev) => {
        const s = new Date(ev.start);
        return sameDay(s, d);
      });
    }
    return map;
  }, [days, events]);

  const defaultStaffId = useMemo(() => {
    const arr = Object.values(staff);
    return arr.length ? arr[0].id : ('s1' as StaffId);
  }, [staff]);

  const weekdayLabels = useMemo(() => {
    const tmp = startOfWeekMonday(new Date());
    return Array.from({ length: 7 }, (_, i) =>
      addDays(tmp, i).toLocaleDateString('da-DK', { weekday: 'short' })
    );
  }, []);

  useEffect(() => {
    // optional: ensure vertical scroll is at top when switching to month
    scrollRef.current?.scrollTo({ top: 0 });
  }, [gridStart, scrollRef]);

  const today = new Date();

  return (
    <div className="relative">
      {/* Header row with weekday names */}
      <div className="sticky top-0 z-10 bg-paper/85 backdrop-blur border-b border-hair/50">
        <div className="grid grid-cols-7">
          {weekdayLabels.map((w, i) => (
            <div key={i} className="px-3 py-2 text-[12px] font-medium text-zinc-600">
              {w}
            </div>
          ))}
        </div>
      </div>

      {/* Month body */}
      <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)]">
        {days.map((d) => (
          <MonthDayCell
            key={d.toDateString()}
            date={d}
            events={eventsByDay[d.toDateString()] ?? []}
            defaultStaffId={defaultStaffId}
            isCurrentMonth={d.getMonth() === monthStart.getMonth()}
            isToday={sameDay(d, today)}
          />
        ))}
      </div>
    </div>
  );
}

const MonthGrid = React.memo(MonthGridComponent);

export default MonthGrid;
