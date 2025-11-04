'use client';

import React, { Fragment, useCallback, useMemo, useRef } from 'react';
import {
  selectEventsForLocalDayByStaff,
  Staff,
  StaffId,
  useCalendar,
} from '@/store/calendar';
import TimeAxis from './TimeAxis';
import ResourceColumn from './ResourceColumn';
import NowLine from './NowLine';
import {
  CALENDAR_DAY_START,
  CALENDAR_DAY_END,
  CALENDAR_PX_PER_MIN,
} from '@/lib/calendar/config';
import {
  clampMinutes,
  isoAtDayMinutes,
  minutesToPixels,
  totalMinutes,
} from '@/lib/calendar/time';
import { useDayColumns } from './hooks/useCalendarColumns';

// 👇 NEW: header height used to offset the grid so 08.00 is visible under staff header
const HEADER_H = 40;
const VIRT_ENABLED = false;

type HourGuidesProps = {
  dayStart: number;
  dayEnd: number;
  pxPerMin: number;
};

function HourGuides({ dayStart, dayEnd, pxPerMin }: HourGuidesProps) {
  const hours = useMemo(
    () => Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i),
    [dayStart, dayEnd]
  );
  const topFor = (h: number, m: number) => ((h - dayStart) * 60 + m) * pxPerMin;

  return (
    <div
      className="absolute pointer-events-none z-0"
      // 👇 overhang 1px at right to avoid visual “cut” by borders/scrollbar gutter
      style={{ top: 0, bottom: 0, left: 0, right: -1 }}
    >
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
}

export default function CalendarGrid({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  const staffMap = useCalendar((s) => s.staff);
  const dateISO = useCalendar((s) => s.dateISO);
  const draft = useCalendar((s) => s.draft);
  const beginRange = useCalendar((s) => s.beginRange);
  const updateRange = useCalendar((s) => s.updateRange);

  // Deterministic staff list (shared by header and body)
  const staffList = useDayColumns(staffMap);
  const columnsTemplate = `repeat(${Math.max(1, staffList.length)}, minmax(260px, 1fr))`;

  const totalMin = totalMinutes(CALENDAR_DAY_START, CALENDAR_DAY_END);
  const columnHeight = minutesToPixels(totalMin, CALENDAR_PX_PER_MIN);

  // Convert a Y position (minutes from day start) to an ISO on the selected day
  const isoFor = useCallback(
    (baseISO: string, minutesFromStart: number) =>
      isoAtDayMinutes(
        baseISO,
        CALENDAR_DAY_START,
        clampMinutes(minutesFromStart, totalMin),
        totalMin
      ),
    [totalMin]
  );

  // Edge auto-scroll while creating ranges
  const rafRef = useRef<number | null>(null);
  const autoScroll = useCallback((clientY: number) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const edge = 48;
    let delta = 0;
    if (clientY < rect.top + edge) delta = -12;
    else if (clientY > rect.bottom - edge) delta = 12;
    if (delta !== 0) {
      scroller.scrollTop += delta;
      rafRef.current = requestAnimationFrame(() => autoScroll(clientY));
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [scrollRef]);

  // Range draft callbacks (ghost-only in ResourceColumn)
  const onCreateStart = useCallback(
    (staffId: StaffId, minutesFromStart: number) => {
      beginRange(staffId, isoFor(dateISO, minutesFromStart));
    },
    [beginRange, dateISO, isoFor]
  );
  const onCreateMove = useCallback(
    (clientY: number, minutesFromStart: number) => {
      autoScroll(clientY);
      updateRange(isoFor(dateISO, minutesFromStart));
    },
    [autoScroll, dateISO, isoFor, updateRange]
  );
  const onCreateEnd = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  return (
    <div className="relative">
      {/* Sticky header with staff & roles */}
      <div
        className="
          sticky top-0 z-40 grid grid-cols-[64px_1fr]
          bg-paper/40 supports-[backdrop-filter]:bg-paper/30
          backdrop-blur-md backdrop-saturate-150
          border-b border-hair/50
        "
      >
        <div />
        <div className="h-10 grid items-center" style={{ gridTemplateColumns: columnsTemplate }}>
          {staffList.map((s) => (
            <div
              key={s.id}
              className="px-3 text-xs font-medium text-muted-foreground truncate flex items-center gap-2 h-10"
              title={`${s.name} • ${s.role}`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color ? `hsl(${s.color})` : 'rgb(59 130 246)' }}
              />
              <span className="truncate">{s.name}</span>
              <span className="text-[10px] text-muted-foreground/80">
                • {s.role.charAt(0).toUpperCase() + s.role.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add the same vertical offset to BOTH the TimeAxis and the grid */}
      <div className="grid grid-cols-[64px_1fr]" style={{ marginTop: HEADER_H }}>
        {/* Left time axis */}
        <div className="sticky left-0 z-10 bg-paper/60">
          <TimeAxis
            pxPerMin={CALENDAR_PX_PER_MIN}
            dayStart={CALENDAR_DAY_START}
            dayEnd={CALENDAR_DAY_END}
          />
        </div>

        {/* Main canvas */}
        <div className="relative">
          <div className="relative w-full" style={{ height: columnHeight }}>
            {/* Background + guides */}
            {!VIRT_ENABLED && (
              <HourGuides
                dayStart={CALENDAR_DAY_START}
                dayEnd={CALENDAR_DAY_END}
                pxPerMin={CALENDAR_PX_PER_MIN}
              />
            )}

            {/* Now line for the selected day */}
            <NowLine
              dateISO={dateISO}
              dayStart={CALENDAR_DAY_START}
              dayEnd={CALENDAR_DAY_END}
              pxPerMin={CALENDAR_PX_PER_MIN}
            />

            {/* Staff columns */}
            <div
              className="absolute inset-0 grid z-10"
              style={{ gridTemplateColumns: columnsTemplate }}
              role="grid"
              aria-label="Dagsskema"
              data-calendar-grid
            >
              {staffList.map((staff) => (
                <ResourceColumnSlot
                  key={staff.id}
                  staff={staff}
                  dateISO={dateISO}
                  draft={draft && draft.staffId === staff.id ? draft : undefined}
                  pxPerMin={CALENDAR_PX_PER_MIN}
                  dayStart={CALENDAR_DAY_START}
                  dayEnd={CALENDAR_DAY_END}
                  onCreateStart={onCreateStart}
                  onCreateMove={onCreateMove}
                  onCreateEnd={onCreateEnd}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ResourceColumnSlotProps = {
  staff: Staff;
  dateISO: string;
  draft?: { start: string; end: string; staffId: string };
  pxPerMin: number;
  dayStart: number;
  dayEnd: number;
  onCreateStart: (staffId: StaffId, minutesFromStart: number) => void;
  onCreateMove: (clientY: number, minutesFromStart: number) => void;
  onCreateEnd: () => void;
};

const ResourceColumnSlot = React.memo(function ResourceColumnSlot({
  staff,
  dateISO,
  draft,
  pxPerMin,
  dayStart,
  dayEnd,
  onCreateStart,
  onCreateMove,
  onCreateEnd,
}: ResourceColumnSlotProps) {
  const selector = useMemo(() => selectEventsForLocalDayByStaff(dateISO, staff.id), [dateISO, staff.id]);
  const events = useCalendar(selector);

  const handleCreateStart = useCallback(
    (yMin: number) => onCreateStart(staff.id, yMin),
    [onCreateStart, staff.id]
  );

  return (
    <ResourceColumn
      staff={staff}
      events={events}
      pxPerMin={pxPerMin}
      dayStart={dayStart}
      dayEnd={dayEnd}
      dateISO={dateISO}
      draft={draft}
      onCreateStart={handleCreateStart}
      onCreateMove={onCreateMove}
      onCreateEnd={onCreateEnd}
    />
  );
});
