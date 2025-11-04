// src/components/calendar/MonthDayCell.tsx
'use client';

import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useCalendar, Event } from '@/store/calendar';
import { SERVICE_META } from './parts/services';
import { useContextMenu } from './ContextMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { openEventEditor } from './eventEditor';

const MAX_VISIBLE = 3;

function fmtTimeDK(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MonthDayCell({
  date,
  events,
  defaultStaffId,
  isCurrentMonth,
  isToday,
}: {
  date: Date;
  events: Event[];
  defaultStaffId: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}) {
  const { setSelection } = useCalendar();
  const { openAt } = useContextMenu();

  const { visible, hidden } = useMemo(() => {
    const sorted = [...events].sort((a, b) => +new Date(a.start) - +new Date(b.start));
    return {
      visible: sorted.slice(0, MAX_VISIBLE),
      hidden: sorted.slice(MAX_VISIBLE),
    };
  }, [events]);

  const onEmptyCreate = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    // Create at 09:00 for 30 min by default; user can change in editor/context
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    openAt(e.clientX, e.clientY, {
      type: 'empty',
      staffId: defaultStaffId,
      startISO: start.toISOString(),
      minutes: 30,
    });
  };

  return (
    <div
      className={[
        'relative h-full w-full p-2 rounded-md',
        isToday ? 'bg-sky-50' : isCurrentMonth ? 'bg-white' : 'bg-zinc-50',
        'border border-hair/70',
      ].join(' ')}
      onDoubleClick={onEmptyCreate}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('[data-month-event], [data-month-more]')) return;
        onEmptyCreate(e);
      }}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <div
          className={[
            'inline-flex items-center justify-center h-6 min-w-6 rounded-md px-1 text-[12px] font-medium',
            isToday ? 'bg-sky-500 text-white' : 'text-zinc-700',
          ].join(' ')}
          title={date.toLocaleDateString('da-DK', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        >
          {date.getDate()}
        </div>
      </div>

      {/* Events (visible) */}
      <div className="space-y-1">
        {visible.map((ev) => {
          const meta = SERVICE_META[ev.serviceType] ?? SERVICE_META.other;
          const Icon = meta.Icon;
          return (
            <button
              key={ev.id}
              type="button"
              data-month-event
              className="w-full group flex items-center gap-2 rounded-md border border-hair bg-white/90 hover:bg-white shadow-sm px-2 py-1 text-left"
              title={`${fmtTimeDK(ev.start)}–${fmtTimeDK(ev.end)} • ${ev.title || meta.label}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelection({ eventId: ev.id });
                openEventEditor(ev.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelection({ eventId: ev.id });
                openAt(e.clientX, e.clientY, {
                  type: 'event',
                  eventId: ev.id,
                });
              }}
            >
              {Icon && (
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: `hsl(${meta.hue} / .25)` }}
                >
                  <Icon size={12} weight="bold" style={{ color: `hsl(${meta.hue})` }} />
                </span>
              )}
              <span className="tabular-nums text-[11px] text-zinc-600">{fmtTimeDK(ev.start)}</span>
              <span className="truncate text-[12px] font-medium text-zinc-800">
                {ev.title || meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* +N more */}
      {hidden.length > 0 && (
        <div className="mt-1" data-month-more>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-hair bg-white/85 px-2 py-1 text-[11px] shadow-sm hover:bg-white"
                title={`${hidden.length} mere`}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                +{hidden.length} mere
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              className="w-72 p-2 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-hair"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="text-[12px] font-medium text-zinc-600 px-1 pb-1">
                {date.toLocaleDateString('da-DK', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <ul className="max-h-80 overflow-auto">
                {[...hidden]
                  .sort((a, b) => +new Date(a.start) - +new Date(b.start))
                  .map((ev) => {
                    const meta = SERVICE_META[ev.serviceType] ?? SERVICE_META.other;
                    const Icon = meta.Icon;
                    return (
                      <li key={ev.id} className="px-2 py-1.5 rounded-md hover:bg-zinc-100">
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 text-[12px] text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelection({ eventId: ev.id });
                            openEventEditor(ev.id);
                          }}
                        >
                          {Icon && (
                            <Icon size={12} weight="bold" style={{ color: `hsl(${meta.hue})` }} />
                          )}
                          <span className="tabular-nums text-zinc-600">{fmtTimeDK(ev.start)}</span>
                          <span className="truncate font-medium text-zinc-800">
                            {ev.title || meta.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
