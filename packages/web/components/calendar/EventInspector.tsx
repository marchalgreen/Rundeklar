// src/components/calendar/EventInspector.tsx
'use client';

import { useCalendar, type CustomerId } from '@/store/calendar';
import { SERVICE_META } from './parts/services';
import { openEventEditor } from './eventEditor';
import CustomerPicker from './parts/CustomerPicker';

export default function EventInspector() {
  const { selection, events, staff } = useCalendar();

  const ev = selection?.eventId ? events[selection.eventId] : undefined;
  if (!ev) {
    return (
      <div className="h-full grid place-items-center text-zinc-400 text-sm">Ingen aftale valgt</div>
    );
  }

  const meta = SERVICE_META[ev.serviceType] ?? SERVICE_META.other;
  const start = new Date(ev.start);
  const end = new Date(ev.end);

  const startStr = start.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = end.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

  const staffName = staff[ev.staffId]?.name ?? 'Ukendt medarbejder';

  return (
    <div className="h-full overflow-auto p-3">
      <div className="tahoe-pane p-3">
        <div className="flex items-center justify-between gap-2">
          <input className="tahoe-input w-full" readOnly value={ev.title || 'Ny aftale'} />
          <button className="tahoe-ghost" onClick={() => openEventEditor(ev.id)}>
            Rediger…
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[13px] text-zinc-600">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: `hsl(${meta.hue})` }}
          />
          {meta.label}
        </div>
        <div className="mt-2 text-[13px] text-zinc-700">
          {start.toLocaleDateString('da-DK', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="tahoe-input" value={startStr} readOnly />
          <input className="tahoe-input" value={endStr} readOnly />
        </div>
        <div className="mt-3 space-y-2 text-[13px]">
          <div>
            <span className="text-zinc-500">Medarbejder:</span> {staffName}
          </div>
          <div>
            <span className="text-zinc-500 block mb-1">Kunde</span>
            <CustomerPicker
              value={ev.customerId}
              onChange={(id) =>
                useCalendar.getState().update(ev.id, { customerId: id as CustomerId })
              }
              placeholder="Vælg kunde"
              buttonClassName="w-full"
            />
          </div>
        </div>
        {/* Notes */}
        <textarea
          className="mt-3 tahoe-input w-full h-24"
          placeholder="Noter (rediger i dialog)"
          value={ev.notes ?? ''}
          readOnly
        />
      </div>
    </div>
  );
}
