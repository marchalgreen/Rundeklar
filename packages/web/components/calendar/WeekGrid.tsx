'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import {
  selectEventsForLocalDay,
  StaffId,
  useCalendar,
} from '@/store/calendar';
import TimeAxis from './TimeAxis';
import NowLine from './NowLine';
import WeekDayColumn from './WeekDayColumn';
import {
  CALENDAR_DAY_START,
  CALENDAR_DAY_END,
  CALENDAR_PX_PER_MIN,
} from '@/lib/calendar/config';
import { isToday, minutesToPixels, totalMinutes } from '@/lib/calendar/time';
import { useDayColumns, useWeekDays } from './hooks/useCalendarColumns';

const HEADER_H = 36; // kompakt header
const DAY_COL_W = 300; // min bredde pr. dag (vandret scroll)
const VIRT_ENABLED = false;

declare global {
  interface Window {
    __lastPointerX?: number;
  }
}

type HourGuidesProps = {
  dayStart: number;
  dayEnd: number;
  pxPerMin: number;
  width: number;
};

const HourGuides = React.memo(function HourGuides({
  dayStart,
  dayEnd,
  pxPerMin,
  width,
}: HourGuidesProps) {
  const hours = useMemo(
    () => Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i),
    [dayStart, dayEnd]
  );
  const topFor = (h: number, m: number) => ((h - dayStart) * 60 + m) * pxPerMin;

  return (
    <div className="absolute inset-y-0 left-0 pointer-events-none z-0" style={{ width }}>
      {hours.map((h, idx) => {
        const isLast = idx === hours.length - 1;
        const hourTop = topFor(h, 0);
        const halfTop = topFor(h, 30);
        return (
          <Fragment key={h}>
            <div className="absolute inset-x-0 border-t border-hair" style={{ top: hourTop }} />
            {!isLast && (
              <div
                className="absolute inset-x-0 border-t border-hair/50"
                style={{ top: halfTop }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
});

const LS_KEY_WEEK_STARTS_TODAY = 'clarity.weekStartsToday';

export default function WeekGrid({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) {
  const dateISO = useCalendar((s) => s.dateISO);
  const staffMap = useCalendar((s) => s.staff);

  // Toggle for uge-start
  const [weekStartsToday, setWeekStartsToday] = useState(false);
  useEffect(() => {
    const raw =
      typeof window !== 'undefined' ? localStorage.getItem(LS_KEY_WEEK_STARTS_TODAY) : null;
    setWeekStartsToday(raw === '1');
  }, []);

  const staffList = useDayColumns(staffMap);
  const defaultStaffId = useMemo<StaffId | undefined>(
    () => (staffList.length ? staffList[0].id : undefined),
    [staffList]
  );

  const days = useWeekDays(dateISO, weekStartsToday);
  const firstDayKey = days[0]?.toISOString() ?? '';

  const setWeekFocusBounds = useCalendar((s) => s.setWeekFocusBounds);

  useEffect(() => {
    if (!days.length) {
      setWeekFocusBounds(undefined);
      return;
    }
    const startISO = days[0].toISOString();
    const endISO = days[days.length - 1].toISOString();
    setWeekFocusBounds({ startISO, endISO });
    return () => {
      setWeekFocusBounds(undefined);
    };
  }, [days, setWeekFocusBounds]);

  // Layout
  const totalMin = totalMinutes(CALENDAR_DAY_START, CALENDAR_DAY_END);
  const columnHeight = minutesToPixels(totalMin, CALENDAR_PX_PER_MIN);
  const totalWidth = days.length * DAY_COL_W;

  // Vandret scroller (krop) + spejlet header (krop -> header)
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyHScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const head = headerRef.current;
    const body = bodyHScrollRef.current;
    if (!head || !body) return;
    const onBody = () => {
      if (head.scrollLeft !== body.scrollLeft) head.scrollLeft = body.scrollLeft;
    };
    body.addEventListener('scroll', onBody, { passive: true });
    return () => body.removeEventListener('scroll', onBody);
  }, []);

  // Hjælper til at centrere "i dag"
  const centerToday = useCallback(() => {
    const body = bodyHScrollRef.current;
    if (!body) return;
    const idx = days.findIndex((d) => isToday(d));
    if (idx < 0) return;
    const target = idx * DAY_COL_W + DAY_COL_W / 2 - body.clientWidth / 2;
    body.scrollLeft = Math.max(0, target);
  }, [days]);

  // Centrer “i dag” ved første visning af en given uge
  useEffect(() => {
    centerToday();
  }, [firstDayKey, days.length, centerToday]);

  // Lytter til toolbar “I dag”
  useEffect(() => {
    const onCenter: EventListener = () => centerToday();
    window.addEventListener('clarity:scrollToToday', onCenter);
    return () => window.removeEventListener('clarity:scrollToToday', onCenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init only
  }, []);

  // Auto-scroll under create/drag
  const vRaf = useRef<number | null>(null);
  const hRaf = useRef<number | null>(null);
  const autoScrollV = useCallback(
    (clientY: number) => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const edge = 48;
      let dy = 0;
      if (clientY < rect.top + edge) dy = -12;
      else if (clientY > rect.bottom - edge) dy = 12;
      if (dy !== 0) {
        scroller.scrollTop += dy;
        vRaf.current = requestAnimationFrame(() => autoScrollV(clientY));
      } else if (vRaf.current) {
        cancelAnimationFrame(vRaf.current);
        vRaf.current = null;
      }
    },
    [scrollRef, vRaf]
  );
  const autoScrollH = useCallback(
    (clientX: number) => {
      const scroller = bodyHScrollRef.current;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const edge = 48;
      let dx = 0;
      if (clientX < rect.left + edge) dx = -16;
      else if (clientX > rect.right - edge) dx = 16;
      if (dx !== 0) {
        scroller.scrollLeft += dx;
        hRaf.current = requestAnimationFrame(() => autoScrollH(clientX));
      } else if (hRaf.current) {
        cancelAnimationFrame(hRaf.current);
        hRaf.current = null;
      }
    },
    [bodyHScrollRef, hRaf]
  );

  const onCreateMove = useCallback(
    (clientY: number, _mins?: number, clientX?: number) => {
      autoScrollV(clientY);
      if (typeof clientX === 'number') autoScrollH(clientX);
    },
    [autoScrollH, autoScrollV]
  );
  const onCreateEnd = useCallback(() => {
    if (vRaf.current) cancelAnimationFrame(vRaf.current);
    vRaf.current = null;
    if (hRaf.current) cancelAnimationFrame(hRaf.current);
    hRaf.current = null;
  }, [hRaf, vRaf]);

  return (
    <div className="relative">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 grid grid-cols-[64px_1fr] bg-paper/40 supports-[backdrop-filter]:bg-paper/30 backdrop-blur-md backdrop-saturate-150">
        <div style={{ height: HEADER_H }} />
        <div className="overflow-x-auto" ref={headerRef}>
          <div
            className="h-9 grid items-center"
            style={{
              gridTemplateColumns: `repeat(${days.length}, ${DAY_COL_W}px)`,
              width: days.length * DAY_COL_W,
            }}
          >
            {days.map((d) => {
              const today = isToday(d);
              return (
                <div
                  key={d.toDateString()}
                  className="px-3 text-xs font-medium truncate h-9 flex items-center gap-2"
                >
                  <span
                    className={[
                      'inline-flex items-center justify-center min-w-7 h-7 rounded-lg px-2',
                      today ? 'bg-sky-500 text-white font-semibold' : 'bg-zinc-100 text-zinc-700',
                    ].join(' ')}
                  >
                    {d.getDate()}
                  </span>
                  <span className="text-muted-foreground">
                    {d.toLocaleDateString('da-DK', { weekday: 'long' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* En enkelt lodret scroller (outer); skub både akse & grid ned samme offset */}
      <div className="grid grid-cols-[64px_1fr]" style={{ marginTop: HEADER_H - 4 }}>
        {/* Venstre tidsakse */}
        <div className="sticky left-0 z-10 bg-paper/60">
          <TimeAxis
            pxPerMin={CALENDAR_PX_PER_MIN}
            dayStart={CALENDAR_DAY_START}
            dayEnd={CALENDAR_DAY_END}
          />
        </div>

        {/* Hovedgrid: kun vandret scroll inde i bodyHScrollRef */}
        <div className="relative">
          <div className="relative w-full" style={{ height: columnHeight }}>
            <div
              className="absolute inset-0 overflow-x-auto overflow-y-hidden"
              ref={bodyHScrollRef}
            >
              <div className="relative" style={{ width: totalWidth, height: columnHeight }}>
                {!VIRT_ENABLED && (
                  <HourGuides
                    dayStart={CALENDAR_DAY_START}
                    dayEnd={CALENDAR_DAY_END}
                    pxPerMin={CALENDAR_PX_PER_MIN}
                    width={totalWidth}
                  />
                )}
                <NowLine
                  dateISO={new Date().toISOString()}
                  dayStart={CALENDAR_DAY_START}
                  dayEnd={CALENDAR_DAY_END}
                  pxPerMin={CALENDAR_PX_PER_MIN}
                />

                <div
                  className="absolute inset-0 grid z-10"
                  style={{
                    gridTemplateColumns: `repeat(${days.length}, ${DAY_COL_W}px)`,
                    width: totalWidth,
                  }}
                  role="grid"
                  aria-label="Ugeskema"
                  data-calendar-grid
                >
                  {days.map((day) => (
                    <WeekDayColumnSlot
                      key={day.toISOString()}
                      date={day}
                      defaultStaffId={defaultStaffId ?? ('s1' as StaffId)}
                      pxPerMin={CALENDAR_PX_PER_MIN}
                      dayStart={CALENDAR_DAY_START}
                      dayEnd={CALENDAR_DAY_END}
                      onCreateStart={() => {}}
                      onCreateMove={(clientY, yMin) => {
                        const lastX = window.__lastPointerX ?? 0;
                        onCreateMove(clientY, yMin, lastX);
                      }}
                      onCreateEnd={onCreateEnd}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type WeekDayColumnSlotProps = {
  date: Date;
  defaultStaffId: StaffId;
  pxPerMin: number;
  dayStart: number;
  dayEnd: number;
  onCreateStart: (yMin: number) => void;
  onCreateMove: (clientY: number, yMin: number) => void;
  onCreateEnd: () => void;
};

const WeekDayColumnSlot = React.memo(function WeekDayColumnSlot({
  date,
  defaultStaffId,
  pxPerMin,
  dayStart,
  dayEnd,
  onCreateStart,
  onCreateMove,
  onCreateEnd,
}: WeekDayColumnSlotProps) {
  const dayISO = useMemo(() => date.toISOString(), [date]);
  const selector = useMemo(() => selectEventsForLocalDay(dayISO), [dayISO]);
  const events = useCalendar(selector);

  return (
    <WeekDayColumn
      date={date}
      events={events}
      defaultStaffId={defaultStaffId}
      pxPerMin={pxPerMin}
      dayStart={dayStart}
      dayEnd={dayEnd}
      onCreateStart={onCreateStart}
      onCreateMove={onCreateMove}
      onCreateEnd={onCreateEnd}
    />
  );
});
