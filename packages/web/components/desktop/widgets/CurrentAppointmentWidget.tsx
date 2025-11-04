'use client';

import React from 'react';
import WidgetShell from './WidgetShell';
import PreviewChrome from './PreviewChrome';
import type { WidgetTone } from '@/store/widgets';
import { useDesktop } from '@/store/desktop';
import { ClipboardPen, Phone, FileText } from 'lucide-react';
import { MOCK_CURRENT_APPOINTMENT } from '@/lib/mock/widgets/currentAppointment.mock';

function CurrentAppointmentBody({
  appt,
  open,
}: {
  appt: typeof MOCK_CURRENT_APPOINTMENT;
  open?: (win: any) => void;
}) {
  if (!appt || appt.status !== 'in_progress') {
    return (
      <div className="h-full grid place-items-center">
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky-500/10 text-sky-600">
            <ClipboardPen className="h-8 w-8" />
          </div>
          <div className="text-[14px] text-zinc-700">Ingen aktiv aftale</div>
          {open && (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-white text-[13px] shadow hover:bg-sky-700 active:bg-sky-800"
              onClick={() =>
                open({
                  type: 'booking_calendar',
                  title: 'Kalender',
                  payload: { intent: 'newBooking' },
                })
              }
            >
              <ClipboardPen className="h-4 w-4" />
              Åbn booking
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-sky-500/10 ring-1 ring-sky-400/30 text-sky-600 text-[18px] font-semibold">
          {appt.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <div className="text-[15px] font-semibold text-zinc-800">{appt.name}</div>
          <div className="text-[13px] text-zinc-500">
            {appt.type} · {appt.start}–{appt.end}
          </div>
        </div>
      </div>

      <div className="text-[13px] text-zinc-600 leading-snug">
        <div>Alder: {appt.age}</div>
        <div>Telefon: {appt.phone}</div>
        <div className="mt-1 italic text-zinc-500">Kendt kunde. {appt.notes}</div>
      </div>

      <div className="flex gap-2 pt-2">
        {open ? (
          <>
            <button
              onClick={() =>
                open({
                  type: 'customerForm',
                  title: `Kundekort — ${appt.name}`,
                  payload: { fromWidget: 'currentAppointment' },
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50"
            >
              <FileText className="h-4 w-4 text-zinc-500" />
              Kundekort
            </button>
            <button
              onClick={() =>
                open({ type: 'logbook', title: 'Logbog', payload: { context: appt.name } })
              }
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50"
            >
              <ClipboardPen className="h-4 w-4 text-zinc-500" />
              Notat
            </button>
            <a
              href={`tel:${appt.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50"
            >
              <Phone className="h-4 w-4 text-zinc-500" />
              Ring
            </a>
          </>
        ) : (
          <div className="text-[12px] text-zinc-500">Handlinger: Kundekort · Notat · Ring</div>
        )}
      </div>
    </div>
  );
}

export function CurrentAppointmentWidgetPreview({ tone }: { tone?: WidgetTone }) {
  const appt =
    MOCK_CURRENT_APPOINTMENT?.status === 'in_progress'
      ? MOCK_CURRENT_APPOINTMENT
      : {
          ...MOCK_CURRENT_APPOINTMENT,
          status: 'in_progress',
          name: 'Camilla Madsen',
          type: 'Synsprøve',
          start: '10:30',
          end: '11:15',
        };

  return (
    <PreviewChrome
      title="Aktuel aftale"
      tone={tone ?? 'primary'}
      width={380}
      height={300}
      scale={0.92}
    >
      <CurrentAppointmentBody appt={appt} />
    </PreviewChrome>
  );
}

export default function CurrentAppointmentWidget() {
  const open = useDesktop((s) => s.open);
  const appt = MOCK_CURRENT_APPOINTMENT;

  return (
    <WidgetShell id="currentAppointment" title="Aktuel aftale" tone="primary">
      <CurrentAppointmentBody appt={appt} open={open} />
    </WidgetShell>
  );
}
