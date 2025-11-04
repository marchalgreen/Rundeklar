'use client';

import { GripVertical } from 'lucide-react';
import { useCalendar, type Event, type StaffId } from '@/store/calendar';
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, SyntheticEvent } from 'react';
import { useContextMenu } from '../ContextMenu';
import { SERVICE_META } from './services';
import { openEventEditor } from '../eventEditor';
import { getCustomerById } from '@/lib/search/kundekortSearch';

const DRAG_THRESHOLD_PX = 6;

/* Day/staff lanes: edge-biased staff targeting with sticky fallback */
function findBiasedStaffIdFromPoint(
  x: number,
  y: number,
  last?: StaffId | null
): StaffId | undefined {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const col = el?.closest('[data-staff-id]') as HTMLElement | null;
  if (!col) return last ?? undefined;
  const rect = col.getBoundingClientRect();
  const pad = 12;
  let sid: StaffId | null = (col.getAttribute('data-staff-id') as StaffId | null) ?? null;
  if (x > rect.right - pad) {
    const nextAttr = (col.nextElementSibling as HTMLElement | null)?.getAttribute('data-staff-id');
    sid = (nextAttr as StaffId | null) ?? sid;
  }
  if (x < rect.left + pad) {
    const prevAttr = (col.previousElementSibling as HTMLElement | null)?.getAttribute(
      'data-staff-id'
    );
    sid = (prevAttr as StaffId | null) ?? sid;
  }
  return sid ?? last ?? undefined;
}

/* Week view: compute ISO for the hit day column */
function hitDayToISO(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const col = el?.closest('[data-day-iso]') as HTMLElement | null;
  if (!col) return null;
  const dayISO = col.getAttribute('data-day-iso')!;
  const start = Number(col.getAttribute('data-day-start')!);
  const ppm = Number(col.getAttribute('data-px-per-min')!);
  const rect = col.getBoundingClientRect();
  const yIn = Math.max(0, y - rect.top);
  const mins = Math.round(yIn / ppm / 15) * 15;
  const d = new Date(dayISO);
  d.setHours(start, 0, 0, 0);
  d.setMinutes(Math.max(0, mins));
  return d.toISOString();
}

/* Format helpers */
function timeRangeDK(a: string, b: string) {
  const s = new Date(a),
    e = new Date(b);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(s)}–${fmt(e)}`;
}

export default function EventChip({
  ev,
  top,
  height,
  toISO,
}: {
  ev: Event;
  top: number;
  height: number;
  toISO: (clientY: number) => string;
}) {
  const beginEventDrag = useCalendar((s) => s.beginEventDrag);
  const updateEventDrag = useCalendar((s) => s.updateEventDrag);
  const commitEventDrag = useCalendar((s) => s.commitEventDrag);
  const cancelEventDrag = useCalendar((s) => s.cancelEventDrag);
  const overlapExists = useCalendar((s) => s.overlapExists);
  const setSelection = useCalendar((s) => s.setSelection);
  const setDragOverStaff = useCalendar((s) => s.setDragOverStaff);

  const selection = useCalendar((s) => s.selection);
  const dragging = useCalendar((s) => s.dragging);
  const view = useCalendar((s) => s.view);

  const selected = selection?.eventId === ev.id;
  const isDraggingThis = dragging?.kind === 'event' && dragging.eventId === ev.id;

  // local drag guard (visual only)
  const [localDragging, setLocalDragging] = useState(false);
  const visualDragging = localDragging && isDraggingThis;

  const { openAt } = useContextMenu();

  const classStatus = useMemo(
    () =>
      [
        ev.status === 'tentative' && 'event--tentative',
        ev.status === 'no_show' && 'event--no-show',
        ev.status === 'cancelled' && 'event--cancelled',
      ]
        .filter(Boolean)
        .join(' '),
    [ev.status]
  );

  const meta = SERVICE_META[ev.serviceType] ?? SERVICE_META.other;
  const hueHsl = meta.hue;
  const [conflict, setConflict] = useState(false);

  // tiering by pixel height (for info density)
  const tier: 'S' | 'M' | 'L' = height <= 28 ? 'S' : height <= 56 ? 'M' : 'L';

  // customer lookup; show as the primary label
  const customer = ev.customerId ? getCustomerById(ev.customerId) : undefined;
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : '—';

  // If title equals the service label (e.g., "Linser"), don't repeat it under the pill
  const serviceLabel = SERVICE_META[ev.serviceType]?.label || '';
  const hasDistinctTitle =
    ev.title && ev.title.trim().length > 0 && ev.title.trim() !== serviceLabel;

  // pointers
  const isPointerDownRef = useRef(false);
  const startedDragRef = useRef(false);
  const startYRef = useRef(0);
  const lastStaffRef = useRef<StaffId | null>(ev.staffId);
  const lastClickTimeRef = useRef<number>(0);

  const swallow = (e: SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  /* MOVE drag */
  const onMoveDown = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    isPointerDownRef.current = true;
    startedDragRef.current = false;
    startYRef.current = e.clientY;
    lastStaffRef.current = ev.staffId;
    setLocalDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // double-click → open editor
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      setSelection({ eventId: ev.id });
      openEventEditor(ev.id);
    }
    lastClickTimeRef.current = now;
  };

  const onMove = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    if (!isPointerDownRef.current) return;

    const dy = Math.abs(e.clientY - startYRef.current);
    if (!startedDragRef.current) {
      if (dy < DRAG_THRESHOLD_PX) return;
      startedDragRef.current = true;
      beginEventDrag(ev.id, 'move', toISO(startYRef.current));
    }

    let iso: string | null = null;
    if (view === 'week') {
      iso = hitDayToISO(e.clientX, e.clientY) ?? toISO(e.clientY);
    } else {
      const sid = findBiasedStaffIdFromPoint(e.clientX, e.clientY, lastStaffRef.current);
      if (sid && sid !== lastStaffRef.current) {
        lastStaffRef.current = sid;
        setDragOverStaff(sid);
      }
      iso = toISO(e.clientY);
    }

    updateEventDrag(iso!);
    const cur = useCalendar.getState().events[ev.id];
    setConflict(overlapExists(cur.staffId, cur.start, cur.end, ev.id));
  };

  const onUp = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    setLocalDragging(false);

    if (isPointerDownRef.current && !startedDragRef.current) {
      setSelection({ eventId: ev.id });
      isPointerDownRef.current = false;
      startedDragRef.current = false;
      return;
    }
    if (startedDragRef.current) {
      commitEventDrag();
      setConflict(false);
    }
    isPointerDownRef.current = false;
    startedDragRef.current = false;
  };

  /* RESIZE */
  const onResizeStartDown = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    isPointerDownRef.current = true;
    startedDragRef.current = true;
    setLocalDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    beginEventDrag(ev.id, 'resize-start', toISO(e.clientY));
  };
  const onResizeEndDown = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    isPointerDownRef.current = true;
    startedDragRef.current = true;
    setLocalDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    beginEventDrag(ev.id, 'resize-end', toISO(e.clientY));
  };
  const onResizeMove = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    if (!isPointerDownRef.current) return;
    const iso =
      view === 'week' ? hitDayToISO(e.clientX, e.clientY) ?? toISO(e.clientY) : toISO(e.clientY);
    updateEventDrag(iso);
    const cur = useCalendar.getState().events[ev.id];
    setConflict(overlapExists(cur.staffId, cur.start, cur.end, ev.id));
  };
  const onResizeUp = (e: PointerEvent<HTMLElement>) => {
    swallow(e);
    setLocalDragging(false);
    if (startedDragRef.current) commitEventDrag();
    isPointerDownRef.current = false;
    startedDragRef.current = false;
    setConflict(false);
  };

  /* Context menu */
  const onContextMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    swallow(e);
    setSelection({ eventId: ev.id });
    openAt(e.clientX, e.clientY, { type: 'event', eventId: ev.id });
  };

  /* Visuals */
  const selectedSolid: CSSProperties = {
    backgroundColor: `hsl(${hueHsl})`,
    color: '#fff',
    borderColor: `hsl(${hueHsl})`,
    boxShadow: 'var(--event-shadow)',
  };
  const selectedWhileDragging: CSSProperties = {
    backgroundColor: `hsl(${hueHsl} / .18)`,
    color: `hsl(${hueHsl})`,
    borderColor: `hsl(${hueHsl} / .45)`,
    boxShadow: 'var(--event-shadow)',
  };
  const unselected: CSSProperties = {
    backgroundColor: `hsl(${hueHsl} / .12)`,
    color: 'rgb(24 24 27)',
    borderColor: 'hsl(var(--line))',
    boxShadow: 'var(--event-shadow)',
  };

  const baseStyles: CSSProperties = selected
    ? visualDragging
      ? selectedWhileDragging
      : selectedSolid
    : unselected;

  const primaryTextClass = selected
    ? visualDragging
      ? `text-[hsl(${hueHsl})]`
      : 'text-white'
    : 'text-zinc-900';

  const secondaryTextClass = selected
    ? visualDragging
      ? `text-[hsl(${hueHsl})]/80`
      : 'text-white/90'
    : 'text-zinc-600';

  const interactiveCursor = isDraggingThis || localDragging ? 'cursor-grabbing' : 'cursor-grab';

  const tooltip = `${customerName} • ${hasDistinctTitle ? ev.title : serviceLabel} • ${timeRangeDK(
    ev.start,
    ev.end
  )}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onContextMenu={onContextMenu}
      className={[
        'group pointer-events-auto absolute left-1 right-1 rounded-xl border shadow-sm transition-transform',
        'will-change-transform',
        classStatus,
        conflict ? 'ring-2 ring-red-500/70' : '',
        selected ? 'ring-focus' : '',
        interactiveCursor,
        'hover:shadow-md hover:border-zinc-300 active:shadow-sm',
      ].join(' ')}
      style={{ top, height, ...baseStyles }}
      onPointerDown={onMoveDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setLocalDragging(false);
        if (startedDragRef.current) cancelEventDrag();
        isPointerDownRef.current = false;
        startedDragRef.current = false;
        setConflict(false);
      }}
      onDoubleClick={() => {
        useCalendar.getState().setSelection({ eventId: ev.id });
        openEventEditor(ev.id);
      }}
      title={tooltip}
      data-event-chip
    >
      {/* left color stem when not selected */}
      {!selected && (
        <div
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-l-xl"
          style={{ backgroundColor: `hsl(${hueHsl})` }}
        />
      )}

      {/* resize handles */}
      <div
        className="absolute inset-x-3 top-0 z-10 h-2 cursor-ns-resize rounded-t-xl opacity-0 group-hover:opacity-100 transition"
        onPointerDown={onResizeStartDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
      />
      <div
        className="absolute inset-x-3 bottom-0 z-10 h-2 cursor-ns-resize rounded-b-xl opacity-0 group-hover:opacity-100 transition"
        onPointerDown={onResizeEndDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
      />

      {/* content */}
      <div className="flex h-full w-full flex-col px-3 py-2">
        {/* Top row: customer first + quiet grip */}
        <div className="flex items-start gap-2">
          {/* Customer name (or initials on S) */}
          {tier === 'S' ? (
            <div className={['truncate text-[13px] font-semibold', primaryTextClass].join(' ')}>
              {customer ? `${customer.firstName} ${customer.lastName[0] ?? ''}.` : '—'}
            </div>
          ) : (
            <div
              className={['truncate text-[14px] font-semibold leading-4', primaryTextClass].join(
                ' '
              )}
            >
              {customerName}
            </div>
          )}

          {/* right-edge grip – quieter by default */}
          <GripVertical
            className={[
              'ml-auto h-3.5 w-3.5 shrink-0 transition-opacity',
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              selected
                ? visualDragging
                  ? `text-[hsl(${hueHsl})]`
                  : 'text-zinc-50'
                : 'text-zinc-500',
            ].join(' ')}
          />
        </div>

        {/* Middle row (M/L): service pill + optional title (only if distinct) */}
        {tier !== 'S' && (
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {/* service pill */}
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[11px] leading-4"
              style={{
                backgroundColor: selected ? 'rgba(255,255,255,.18)' : `hsl(${hueHsl} / .18)`,
                color: selected ? '#fff' : `hsl(${hueHsl})`,
              }}
              title={serviceLabel}
            >
              {(() => {
                const Icon = SERVICE_META[ev.serviceType]?.Icon;
                return Icon ? <Icon size={11} weight="bold" /> : null;
              })()}
              <span className="truncate">{serviceLabel}</span>
            </span>

            {/* Only show title if it’s not the same as service label */}
            {hasDistinctTitle && (
              <span className={['truncate text-[12px]', secondaryTextClass].join(' ')}>
                {ev.title}
              </span>
            )}
          </div>
        )}

        {/* Bottom row: time range in Danish, always visible */}
        <div
          className={[
            'mt-auto text-[11px] tabular-nums',
            selected ? 'text-white/90' : 'text-zinc-700',
          ].join(' ')}
        >
          {timeRangeDK(ev.start, ev.end)}
        </div>
      </div>
    </div>
  );
}
