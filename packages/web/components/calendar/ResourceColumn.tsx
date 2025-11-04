'use client';

import { memo, useMemo, useRef, useCallback } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useCalendar, Event, Staff } from '@/store/calendar';
import EventChip from './parts/EventChip';
import { useContextMenu } from './ContextMenu';
import { SERVICE_META } from './parts/services';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CALENDAR_CLICK_DEFAULT_MIN,
  CALENDAR_DRAG_THRESHOLD_PX,
  CALENDAR_MAX_VISIBLE_OVERLAPS,
  CALENDAR_MIN_EVENT_HEIGHT_PX,
  CALENDAR_MIN_SLOT_MIN,
} from '@/lib/calendar/config';
import {
  durationMinutes,
  isoAtDayMinutes,
  isoToDayMinutes,
  minutesToPixels,
  pixelsToMinutes,
  snapMinutes,
  totalMinutes,
  clampMinutes,
  sameLocalDay,
} from '@/lib/calendar/time';
import { computeOverlapLayout } from '@/lib/calendar/overlap';
import { openEventEditor } from './eventEditor';

function ResourceColumn({
  staff,
  events,
  pxPerMin,
  dayStart,
  dayEnd,
  dateISO,
  draft,
  onCreateStart,
  onCreateMove,
  onCreateEnd,
}: {
  staff: Staff;
  events: Event[];
  pxPerMin: number;
  dayStart: number;
  dayEnd: number;
  dateISO: string;
  draft?: { start: string; end: string; staffId: string };
  onCreateStart: (yMin: number) => void;
  onCreateMove: (clientY: number, yMin: number) => void;
  onCreateEnd: () => void;
}) {
  const beginRange = useCalendar((s) => s.beginRange);
  const updateRange = useCalendar((s) => s.updateRange);
  const overlapExists = useCalendar((s) => s.overlapExists);
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
  const { openAt } = useContextMenu();
  const colRef = useRef<HTMLDivElement>(null);

  const totalMin = totalMinutes(dayStart, dayEnd);
  const columnHeight = minutesToPixels(totalMin, pxPerMin);

  const isColumnFocused =
    focusedSlot?.view === 'day' &&
    focusedSlot.staffId === staff.id &&
    sameLocalDay(focusedSlot.dateISO, dateISO);
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
    isColumnFocused && focusMinute !== null ? `${staff.id}:${focusMinute}` : undefined;

  const minutesFromClientY = (clientY: number) => {
    const rect = colRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const yRaw = clientY - rect.top;
    const y = Math.max(0, Math.min(yRaw, columnHeight));
    const mins = pixelsToMinutes(y, pxPerMin);
    const snapped = snapMinutes(mins, CALENDAR_MIN_SLOT_MIN);
    return clampMinutes(snapped, totalMin);
  };
  const isoFromMinutes = (mins: number) => isoAtDayMinutes(dateISO, dayStart, mins, totalMin);

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
    const startISO = isoFromMinutes(startMin);
    const endISO = isoFromMinutes(endMin);
    beginRange(staff.id, startISO);
    updateRange(endISO);

    const rect = colRef.current?.getBoundingClientRect();
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const yOffset = minutesToPixels(startMin, pxPerMin);
    const x = rect ? rect.left + rect.width / 2 : viewportWidth / 2;
    const y = rect ? rect.top + yOffset : viewportHeight / 2;

    openAt(x, y, {
      type: 'empty',
      staffId: staff.id,
      startISO: startISO,
      minutes: duration,
    });
  }, [
    beginRange,
    updateRange,
    focusMinute,
    totalMin,
    isoFromMinutes,
    staff.id,
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
        view: 'day',
        dateISO,
        staffId: staff.id,
        minute: clampMinutes(minuteRaw, totalMin),
      });
    },
    [dateISO, focusMinute, focusSlot, staff.id, totalMin]
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

  // ---- empty-space context menu ----
  const onContextMenuEmpty = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-chip], [data-overflow]')) return;
    e.preventDefault();
    const mins = minutesFromClientY(e.clientY);
    beginRange(staff.id, isoFromMinutes(mins));
    updateRange(isoFromMinutes(mins + CALENDAR_CLICK_DEFAULT_MIN));
    openAt(e.clientX, e.clientY, {
      type: 'empty',
      staffId: staff.id,
      startISO: isoFromMinutes(mins),
      minutes: CALENDAR_CLICK_DEFAULT_MIN,
    });
  };

  // ---- create-by-drag handlers (unchanged) ----
  const isCreatingRef = useRef(false);
  const startClientYRef = useRef(0);
  const lastClientYRef = useRef(0);
  const startMinutesRef = useRef(0);

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-chip], [data-overflow]')) return;
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isCreatingRef.current = true;
    const startMin = minutesFromClientY(e.clientY);
    startClientYRef.current = e.clientY;
    lastClientYRef.current = e.clientY;
    startMinutesRef.current = startMin;
    onCreateStart(startMin);
    const s = useCalendar.getState();
    s.beginRange(staff.id, isoFromMinutes(startMin));
    s.updateRange(isoFromMinutes(startMin));
  };
  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!isCreatingRef.current || !(e.buttons & 1)) return;
    const mins = minutesFromClientY(e.clientY);
    lastClientYRef.current = e.clientY;
    onCreateMove(e.clientY, mins);
    useCalendar.getState().updateRange(isoFromMinutes(mins));
  };
  const handlePointerUp = (e: PointerEvent<HTMLElement>) => {
    if (!isCreatingRef.current) return;
    isCreatingRef.current = false;
    onCreateEnd();
    const deltaPx = Math.abs(lastClientYRef.current - startClientYRef.current);
    let startMin = startMinutesRef.current;
    let minutesSuggested = CALENDAR_CLICK_DEFAULT_MIN;
    if (deltaPx >= CALENDAR_DRAG_THRESHOLD_PX) {
      const endMin = minutesFromClientY(e.clientY);
      const dur = Math.max(CALENDAR_MIN_SLOT_MIN, Math.abs(endMin - startMin));
      if (endMin < startMin) startMin = endMin;
      minutesSuggested = dur;
    }
    const s = useCalendar.getState();
    s.beginRange(staff.id, isoFromMinutes(startMin));
    s.updateRange(isoFromMinutes(startMin + minutesSuggested));
    openAt(e.clientX, e.clientY, {
      type: 'empty',
      staffId: staff.id,
      startISO: isoFromMinutes(startMin),
      minutes: minutesSuggested,
    });
  };

  // ---- draft ghost ----
  const draftPos = useMemo(() => {
    if (!draft || draft.staffId !== staff.id) return null;
    const topMin = isoToDayMinutes(draft.start, dayStart);
    const durMin = durationMinutes(draft.start, draft.end);
    return {
      top: minutesToPixels(topMin, pxPerMin),
      height: Math.max(
        minutesToPixels(durMin, pxPerMin),
        CALENDAR_MIN_EVENT_HEIGHT_PX
      ),
    };
  }, [draft, dayStart, pxPerMin, staff.id]);

  const ghostConflict = draft ? overlapExists(staff.id, draft.start, draft.end) : false;

  // ---- event-drag ghost (between staff) ----
  const dragging = useCalendar((s) => s.dragging);
  const dragOverStaffId = useCalendar((s) => s.dragOverStaffId);
  const allEvents = useCalendar((s) => s.events);
  const isTarget = dragging?.kind === 'event' && dragOverStaffId === staff.id;
  let dragGhostTop: number | null = null,
    dragGhostHeight: number | null = null,
    dragGhostBorder = 'hsl(var(--line))',
    dragGhostBg = 'transparent';
  if (isTarget) {
    const dragged = dragging ? allEvents[dragging.eventId] : undefined;
    if (dragged) {
      const topMin = isoToDayMinutes(dragged.start, dayStart);
      const durMin = durationMinutes(dragged.start, dragged.end);
      dragGhostTop = minutesToPixels(topMin, pxPerMin);
      dragGhostHeight = Math.max(
        minutesToPixels(durMin, pxPerMin),
        CALENDAR_MIN_EVENT_HEIGHT_PX
      );
      const hue = SERVICE_META[dragged.serviceType]?.hue ?? SERVICE_META.other.hue;
      dragGhostBorder = `hsl(${hue})`;
      dragGhostBg = `hsl(${hue} / .10)`;
    }
  }

  // ---- render ----
  return (
    <div
      ref={colRef}
      className="relative border-r border-hair"
      style={{ height: columnHeight }}
      tabIndex={0}
      role="gridcell"
      aria-label={`${staff.name} tidskolonne`}
      aria-selected={isColumnFocused}
      onContextMenu={onContextMenuEmpty}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyDownCapture={handleKeyDownCapture}
      data-staff-id={staff.id}
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

      <div className="pointer-events-none absolute left-0 right-0 top-0 bottom-0">
        {/* Visible events (cap at MAX_VISIBLE_OVERLAPS) */}
        {pos.map(({ ev, top, height, col, cols, gid }) => {
          const visibleCols = Math.min(cols, CALENDAR_MAX_VISIBLE_OVERLAPS);
          if (col >= CALENDAR_MAX_VISIBLE_OVERLAPS) return null; // hidden: handled by badge
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
                  const mins = minutesFromClientY(y);
                  return isoFromMinutes(mins);
                }}
              />
            </div>
          );
        })}

        {/* "+N mere" badges for overflow groups */}
        {groups
          .filter((g) => g.maxCols > CALENDAR_MAX_VISIBLE_OVERLAPS && g.hiddenCount > 0)
          .map((g) => {
            const visibleCols = Math.min(g.maxCols, CALENDAR_MAX_VISIBLE_OVERLAPS);
            const widthPercent = 100 / visibleCols;
            const leftPercent = (visibleCols - 1) * widthPercent;
            const top = g.top + 2;
            const height = Math.max(18, g.bottom - g.top - 4);

            // Collect hidden events in this group
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
                      // prevent new-event create by swallowing pointer/click
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

        {/* Draft ghost (create) */}
        {draftPos && draft?.staffId === staff.id && (
          <div
            className={`absolute left-1 right-1 rounded-xl border ${
              ghostConflict ? 'border-red-500/80 bg-red-200/30' : 'border-sky-500/70 bg-sky-400/20'
            }`}
            style={{ top: draftPos.top, height: draftPos.height }}
          />
        )}

        {/* Drag ghost (move between staff) */}
        {isTarget && dragGhostTop !== null && dragGhostHeight !== null && (
          <div
            className="absolute left-1 right-1 rounded-xl border-2 border-dashed"
            style={{
              top: dragGhostTop,
              height: dragGhostHeight,
              borderColor: dragGhostBorder,
              backgroundColor: dragGhostBg,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default memo(ResourceColumn);

function formatTimeRange(a: string, b: string) {
  const s = new Date(a),
    e = new Date(b);
  return `${s.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}–${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
