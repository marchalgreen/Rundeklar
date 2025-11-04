'use client';

import { memo, useMemo, useRef, useCallback } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useCalendar, Event } from '@/store/calendar';
import EventChip from './parts/EventChip';
import { useContextMenu } from './ContextMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SERVICE_META } from './parts/services';
import {
  CALENDAR_CLICK_DEFAULT_MIN,
  CALENDAR_DRAG_THRESHOLD_PX,
  CALENDAR_MAX_VISIBLE_OVERLAPS,
  CALENDAR_MIN_EVENT_HEIGHT_PX,
  CALENDAR_MIN_SLOT_MIN,
} from '@/lib/calendar/config';
import {
  clampMinutes,
  durationMinutes,
  isoAtDayMinutes,
  isoToDayMinutes,
  minutesToPixels,
  pixelsToMinutes,
  snapMinutes,
  totalMinutes,
  sameLocalDay,
} from '@/lib/calendar/time';
import { computeOverlapLayout } from '@/lib/calendar/overlap';
import { openEventEditor } from './eventEditor';

const setLastPointerX = (clientX: number) => {
  (window as typeof window & { __lastPointerX?: number }).__lastPointerX = clientX;
};

function WeekDayColumn({
  date,
  events,
  pxPerMin,
  dayStart,
  dayEnd,
  defaultStaffId,
  onCreateStart,
  onCreateMove,
  onCreateEnd,
}: {
  date: Date;
  events: Event[];
  pxPerMin: number;
  dayStart: number;
  dayEnd: number;
  defaultStaffId: string;
  onCreateStart: (yMin: number) => void;
  onCreateMove: (clientY: number, yMin: number) => void;
  onCreateEnd: () => void;
}) {
  const beginRange = useCalendar((s) => s.beginRange);
  const updateRange = useCalendar((s) => s.updateRange);
  const overlapExists = useCalendar((s) => s.overlapExists);
  const draft = useCalendar((s) => s.draft);
  const { openAt } = useContextMenu();
  const colRef = useRef<HTMLDivElement>(null);

  const focusSlot = useCalendar((s) => s.focusSlot);
  const focusClear = useCalendar((s) => s.focusClear);
  const focusedSlot = useCalendar((s) => s.focusedSlot);
  const moveUp = useCalendar((s) => s.moveUp);
  const moveDown = useCalendar((s) => s.moveDown);
  const moveLeft = useCalendar((s) => s.moveLeft);
  const moveRight = useCalendar((s) => s.moveRight);
  const homeKey = useCalendar((s) => s.home);
  const endKey = useCalendar((s) => s.end);
  const pagePrev = useCalendar((s) => s.pagePrev);
  const pageNext = useCalendar((s) => s.pageNext);
  const setSelection = useCalendar((s) => s.setSelection);

  const totalMin = totalMinutes(dayStart, dayEnd);
  const columnHeight = minutesToPixels(totalMin, pxPerMin);

  const dateISO = date.toISOString();
  const isColumnFocused =
    focusedSlot?.view === 'week' && sameLocalDay(focusedSlot.dateISO, dateISO);
  const focusMinute = isColumnFocused ? clampMinutes(focusedSlot?.minute ?? 0, totalMin) : null;
  const focusHeight = Math.max(
    CALENDAR_MIN_EVENT_HEIGHT_PX,
    minutesToPixels(CALENDAR_MIN_SLOT_MIN, pxPerMin)
  );
  const focusTop =
    focusMinute === null
      ? null
      : Math.min(
          Math.max(minutesToPixels(focusMinute, pxPerMin) - focusHeight / 2, 0),
          Math.max(columnHeight - focusHeight, 0)
        );
  const slotData =
    isColumnFocused && focusMinute !== null ? `${dateISO}:${focusMinute}` : undefined;
  const dateLabel = date.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const minutesFromClientY = (clientY: number) => {
    const rect = colRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const yRaw = clientY - rect.top;
    const y = Math.max(0, Math.min(yRaw, columnHeight));
    const mins = pixelsToMinutes(y, pxPerMin);
    const snapped = snapMinutes(mins, CALENDAR_MIN_SLOT_MIN);
    return clampMinutes(snapped, totalMin);
  };

  const toISO = (mins: number) => isoAtDayMinutes(date, dayStart, mins, totalMin);

  const openKeyboardCreate = useCallback(() => {
    const state = useCalendar.getState();
    const minuteRaw = state.focusedSlot?.minute ?? focusMinute ?? 0;
    const startMin = clampMinutes(minuteRaw, totalMin);
    const remaining = Math.max(totalMin - startMin, CALENDAR_MIN_SLOT_MIN);
    const duration = Math.max(
      CALENDAR_MIN_SLOT_MIN,
      Math.min(CALENDAR_CLICK_DEFAULT_MIN, remaining)
    );
    const endMin = clampMinutes(startMin + duration, totalMin);
    const startISO = toISO(startMin);
    const endISO = toISO(endMin);
    beginRange(defaultStaffId, startISO);
    updateRange(endISO);

    const rect = colRef.current?.getBoundingClientRect();
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const yOffset = minutesToPixels(startMin, pxPerMin);
    const x = rect ? rect.left + rect.width / 2 : viewportWidth / 2;
    const y = rect ? rect.top + yOffset : viewportHeight / 2;

    openAt(x, y, {
      type: 'empty',
      staffId: defaultStaffId,
      startISO: startISO,
      minutes: duration,
    });
  }, [
    beginRange,
    updateRange,
    focusMinute,
    totalMin,
    defaultStaffId,
    toISO,
    pxPerMin,
    openAt,
  ]);

  const { positioned: pos, groups } = useMemo(
    () =>
      computeOverlapLayout(events, {
        dayStart,
        pxPerMinute: pxPerMin,
        maxVisible: CALENDAR_MAX_VISIBLE_OVERLAPS,
      }),
    [events, dayStart, pxPerMin]
  );

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const minuteRaw = useCalendar.getState().focusedSlot?.minute ?? focusMinute ?? 0;
      focusSlot({
        view: 'week',
        dateISO,
        staffId: defaultStaffId,
        minute: clampMinutes(minuteRaw, totalMin),
      });
    },
    [dateISO, defaultStaffId, focusMinute, focusSlot, totalMin]
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      focusClear();
    },
    [focusClear]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'Home':
          e.preventDefault();
          homeKey();
          break;
        case 'End':
          e.preventDefault();
          endKey();
          break;
        case 'PageUp':
          e.preventDefault();
          pagePrev();
          break;
        case 'PageDown':
          e.preventDefault();
          pageNext();
          break;
        case 'Enter':
          e.preventDefault();
          openKeyboardCreate();
          break;
        case ' ': // Space key
        case 'Spacebar':
          e.preventDefault();
          openKeyboardCreate();
          break;
        default:
          break;
      }
    },
    [
      moveUp,
      moveDown,
      moveLeft,
      moveRight,
      homeKey,
      endKey,
      pagePrev,
      pageNext,
      openKeyboardCreate,
    ]
  );

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const wrapper = target.closest<HTMLElement>('[data-event-chip-wrapper]');
      if (!wrapper) return;
      const eventId = wrapper.getAttribute('data-event-id');
      if (!eventId) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setSelection({ eventId: eventId as string });
        openEventEditor(eventId as string);
      }
    },
    [setSelection]
  );

  /* ---------- Empty-space context menu ---------- */
  const onContextMenuEmpty = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-chip], [data-overflow]')) return; // ignore chips/overflow
    e.preventDefault();
    const mins = minutesFromClientY(e.clientY);
    beginRange(defaultStaffId, toISO(mins));
    updateRange(toISO(mins + CALENDAR_CLICK_DEFAULT_MIN));
    openAt(e.clientX, e.clientY, {
      type: 'empty',
      staffId: defaultStaffId,
      startISO: toISO(mins),
      minutes: CALENDAR_CLICK_DEFAULT_MIN,
    });
  };

  /* ---------- Create-by-drag handlers (unchanged) ---------- */
  const isCreatingRef = useRef(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const startMinRef = useRef(0);

  const handlePD = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-chip], [data-overflow]')) return;
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isCreatingRef.current = true;
    setLastPointerX(e.clientX);

    const startMin = minutesFromClientY(e.clientY);
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    startMinRef.current = startMin;

    onCreateStart(startMin);
    beginRange(defaultStaffId, toISO(startMin)); // ghost immediately
    updateRange(toISO(startMin)); // collapsed
  };

  const handlePM = (e: PointerEvent<HTMLElement>) => {
    if (!isCreatingRef.current || !(e.buttons & 1)) return;
    setLastPointerX(e.clientX);
    const mins = minutesFromClientY(e.clientY);
    lastYRef.current = e.clientY;
    onCreateMove(e.clientY, mins);
    updateRange(toISO(mins));
  };

  const handlePU = (e: PointerEvent<HTMLElement>) => {
    if (!isCreatingRef.current) return;
    isCreatingRef.current = false;
    onCreateEnd();
    setLastPointerX(e.clientX);

    const deltaPx = Math.abs(lastYRef.current - startYRef.current);
    let startMin = startMinRef.current;
    let minutesSuggested = CALENDAR_CLICK_DEFAULT_MIN;

    if (deltaPx >= CALENDAR_DRAG_THRESHOLD_PX) {
      const endMin = minutesFromClientY(e.clientY);
      const dur = Math.max(CALENDAR_MIN_SLOT_MIN, Math.abs(endMin - startMin));
      if (endMin < startMin) startMin = endMin;
      minutesSuggested = dur;
    }
    beginRange(defaultStaffId, toISO(startMin));
    updateRange(toISO(startMin + minutesSuggested));

    openAt(e.clientX, e.clientY, {
      type: 'empty',
      staffId: defaultStaffId,
      startISO: toISO(startMin),
      minutes: minutesSuggested,
    });
  };

  /* ---------- Draft (ghost) preview (FIXED) ---------- */
  const draftGhost = useMemo(() => {
    if (!draft || draft.staffId !== defaultStaffId) return null;
    const s = new Date(draft.start);
    if (
      s.getFullYear() !== date.getFullYear() ||
      s.getMonth() !== date.getMonth() ||
      s.getDate() !== date.getDate()
    )
      return null;

    const topMin = isoToDayMinutes(draft.start, dayStart);
    const durMin = durationMinutes(draft.start, draft.end);
    const conflict = overlapExists(defaultStaffId, draft.start, draft.end);
    return {
      top: minutesToPixels(topMin, pxPerMin),
      height: Math.max(
        minutesToPixels(durMin, pxPerMin),
        CALENDAR_MIN_EVENT_HEIGHT_PX
      ),
      conflict,
    };
  }, [draft, defaultStaffId, date, dayStart, pxPerMin, overlapExists]);

  /* ---------- Render ---------- */
  return (
    <div
      ref={colRef}
      className="relative border-r border-hair"
      style={{ height: columnHeight }}
      onContextMenu={onContextMenuEmpty}
      onPointerDown={handlePD}
      onPointerMove={handlePM}
      onPointerUp={handlePU}
      tabIndex={0}
      role="gridcell"
      aria-label={`${dateLabel} tidskolonne`}
      aria-selected={isColumnFocused}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyDownCapture={handleKeyDownCapture}
      data-day-iso={date.toISOString()}
      data-day-start={dayStart}
      data-px-per-min={pxPerMin}
      data-slot={slotData}
    >
      <div className="absolute inset-0" aria-hidden />

      {isColumnFocused && focusTop !== null && (
        <div
          className="pointer-events-none absolute left-1 right-1 rounded-xl border-2 border-sky-500/60 bg-sky-400/15 motion-safe:transition-all motion-safe:duration-150"
          style={{ top: focusTop, height: focusHeight }}
          data-slot-indicator
          aria-hidden
        />
      )}

      <div className="pointer-events-none absolute inset-0">
        {/* visible events (cap at MAX_VISIBLE_OVERLAPS) */}
        {pos.map(({ ev, top, height, col, cols, gid }) => {
          const visibleCols = Math.min(cols, CALENDAR_MAX_VISIBLE_OVERLAPS);
          if (col >= CALENDAR_MAX_VISIBLE_OVERLAPS) return null;
          const widthPercent = 100 / visibleCols;
          const leftPercent = col * widthPercent;

          return (
            <div
              key={ev.id}
              className="absolute px-0.5 pointer-events-auto"
              style={{ top, height, left: `${leftPercent}%`, width: `${widthPercent}%` }}
              data-event-chip
              data-event-chip-wrapper
              data-group-id={gid}
              data-event-id={ev.id}
            >
              <EventChip
                ev={ev}
                top={0}
                height={height}
                toISO={(y) => {
                  const rect = colRef.current?.getBoundingClientRect();
                  const yIn = rect ? Math.max(0, y - rect.top) : 0;
                  const mins = clampMinutes(
                    snapMinutes(pixelsToMinutes(yIn, pxPerMin), CALENDAR_MIN_SLOT_MIN),
                    totalMin
                  );
                  return toISO(mins);
                }}
              />
            </div>
          );
        })}

        {/* overflow "+N mere" (clickable; does NOT trigger create) */}
        {groups
          .filter((g) => g.maxCols > CALENDAR_MAX_VISIBLE_OVERLAPS && g.hiddenCount > 0)
          .map((g) => {
            const visibleCols = Math.min(g.maxCols, CALENDAR_MAX_VISIBLE_OVERLAPS);
            const widthPercent = 100 / visibleCols;
            const leftPercent = (visibleCols - 1) * widthPercent;
            const top = g.top + 2;
            const height = Math.max(18, g.bottom - g.top - 4);
            const hidden = pos.filter(
              (p) => p.gid === g.id && p.col >= CALENDAR_MAX_VISIBLE_OVERLAPS
            );

            return (
              <div
                key={`overflow-${g.id}`}
                className="absolute px-0.5 pointer-events-auto"
                style={{ top, height, left: `${leftPercent}%`, width: `${widthPercent}%` }}
                data-overflow
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-6 rounded-full border bg-white/85 backdrop-blur text-[11px] border-hair hover:bg-white shadow-sm flex items-center justify-center"
                      title={`${g.hiddenCount} mere`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      +{g.hiddenCount} mere
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-64 p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-hair"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="text-[12px] font-medium text-zinc-600 px-1 pb-1">
                      Overlappende aftaler
                    </div>
                    <ul className="max-h-72 overflow-auto">
                      {hidden.map((p) => {
                        const meta = SERVICE_META[p.ev.serviceType] ?? SERVICE_META.other;
                        const Icon = meta.Icon;
                        return (
                          <li
                            key={`hidden-${p.ev.id}`}
                            className="px-2 py-1.5 rounded-md hover:bg-zinc-100 text-[13px] flex items-center gap-2"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {Icon && (
                              <Icon size={14} weight="bold" style={{ color: `hsl(${meta.hue})` }} />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{p.ev.title || meta.label}</div>
                              <div className="text-[11px] text-zinc-500">
                                {formatTimeRange(p.ev.start, p.ev.end)}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}

        {/* draft ghost (create-by-drag) */}
        {draftGhost && (
          <div
            className={`absolute left-1 right-1 rounded-xl border ${
              draftGhost.conflict
                ? 'border-red-500/80 bg-red-200/30'
                : 'border-sky-500/70 bg-sky-400/20'
            }`}
            style={{ top: draftGhost.top, height: draftGhost.height }}
          />
        )}
      </div>
    </div>
  );
}

export default memo(WeekDayColumn);

/* utils */
function formatTimeRange(a: string, b: string) {
  const s = new Date(a),
    e = new Date(b);
  return `${s.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}–${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
