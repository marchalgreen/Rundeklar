'use client';

import { useEffect, useMemo, useState, useRef, useCallback, type ChangeEvent } from 'react';
import {
  useCalendar,
  focusRestoreAnchor,
  type Event as CalendarEvent,
  type StaffId,
} from '@/store/calendar';
import { SERVICE_META } from './parts/services';
import { closeEventEditor, subscribeEditorOpen } from './eventEditor';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { kundekortSearch, getCustomerById } from '@/lib/search/kundekortSearch';
import type { CustomerId } from '@/lib/mock/customers';

// ---------- små tidsværktøjer ----------
function toHHMM(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
function sameDayISO(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function setTimeOnISO(dayISO: string, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dayISO);
  d.setHours(h, m ?? 0, 0, 0);
  return d.toISOString();
}
function fmtRange(a: string, b: string) {
  const s = new Date(a),
    e = new Date(b);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)}–${fmt(e)}`;
}

// ---------- Kunde-vælger (søgebar; portal inde i dialogen) ----------
function CustomerPicker({
  value,
  onChange,
  withinDialog,
  autoOpen,
}: {
  value?: CustomerId;
  onChange: (id: CustomerId | undefined) => void;
  withinDialog?: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Portal inde i dialogen så Radix' inert ikke blokerer
  useEffect(() => {
    if (withinDialog) {
      const el = document.querySelector('[data-radix-dialog-content]') as HTMLElement | null;
      setContainer(el);
    }
  }, [withinDialog]);

  // Auto-åbn (fx efter oprettelse)
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [autoOpen]);

  const hits = useMemo(() => (q ? kundekortSearch(q, 6).flat : []), [q]);
  useEffect(() => {
    setActive((i) => (hits.length ? Math.max(0, Math.min(i, hits.length - 1)) : 0));
  }, [hits.length]);

  const selected = value ? getCustomerById(value as string) : undefined;

  const closePicker = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setQ('');
          setActive(0);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className="tahoe-input w-full justify-between">
          <span className="truncate text-left">
            {selected ? `${selected.firstName} ${selected.lastName}` : 'Vælg kunde'}
          </span>
          <span className="text-zinc-400 text-xs">▾</span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal container={withinDialog ? container ?? undefined : undefined}>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[1000] w-[min(520px,90vw)] p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-hair
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <input
            ref={inputRef}
            className="tahoe-input w-full mb-2"
            placeholder="Søg navn, tlf, e-mail eller kundenr."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Enter uden søgning = spring over
                if (!q.trim()) {
                  e.preventDefault();
                  closePicker();
                  return;
                }
                // Enter med søgning = vælg aktiv
                if (hits.length) {
                  e.preventDefault();
                  const h = hits[active];
                  const c = h ? getCustomerById(h.id) : undefined;
                  if (c) {
                    onChange(c.id as CustomerId);
                    closePicker();
                  }
                }
                return;
              }
              if (!hits.length) {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closePicker();
                }
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closePicker();
              }
            }}
          />

          {/* Hint-linje */}
          <div className="px-1 pb-1 text-[11px] text-zinc-500">
            {q.trim()
              ? 'Enter vælger den markerede kunde • Esc lukker'
              : 'Tip: Tryk Enter for at springe over'}
          </div>

          <div className="max-h-72 overflow-auto">
            {hits.length === 0 && q ? (
              <div className="text-sm text-zinc-500 px-2 py-6 text-center">Ingen kunder fundet</div>
            ) : null}

            <ul>
              {hits.map((h, i) => {
                const c = getCustomerById(h.id);
                if (!c) return null;
                return (
                  <li key={`${h.category}-${c.id}`}>
                    <button
                      type="button"
                      className={[
                        'w-full px-2 py-2 rounded-md text-left text-[13px]',
                        i === active ? 'bg-zinc-100' : 'hover:bg-zinc-100',
                      ].join(' ')}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        onChange(c.id as CustomerId);
                        closePicker();
                      }}
                    >
                      <div className="font-medium truncate">
                        {c.firstName} {c.lastName}{' '}
                        {c.customerNo ? (
                          <span className="text-zinc-500 font-normal">• #{c.customerNo}</span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {c.phoneMobile || c.phoneWork || '—'} {c.email ? `• ${c.email}` : ''}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected && (
            <div className="pt-2 mt-2 border-t border-hair/70 flex items-center justify-between">
              <div className="text-[12px] text-zinc-600 truncate">
                Valgt:{' '}
                <span className="font-medium">
                  {selected.firstName} {selected.lastName}
                </span>
                {selected.customerNo ? (
                  <span className="text-zinc-500"> • #{selected.customerNo}</span>
                ) : null}
              </div>
              <button
                type="button"
                className="tahoe-ghost"
                onClick={() => {
                  onChange(undefined);
                  setQ('');
                }}
              >
                Ryd
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// ---------- Dialogen ----------
type Form = {
  title: string;
  serviceType: keyof typeof SERVICE_META;
  staffId: string;
  customerId?: CustomerId;
  dateISO: string; // dagsbucket (00:00)
  start: string; // HH:mm
  end: string; // HH:mm
  status: 'booked' | 'tentative' | 'checked_in' | 'completed' | 'no_show' | 'cancelled';
  notes: string;
};

export default function EventDetailsDialog() {
  const { events, staff, update, setSelection } = useCalendar();
  const staffList = useMemo(() => Object.values(staff), [staff]);

  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const ev = eventId ? events[eventId] : undefined;

  const [form, setForm] = useState<Form | null>(null);

  const wasOpenRef = useRef(open);
  useEffect(() => {
    const prev = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open && !prev) {
      const state = useCalendar.getState();
      if (!state.focusAnchor) {
        const active = document.activeElement as HTMLElement | null;
        state.setFocusAnchor(active);
      }
    } else if (!open && prev) {
      focusRestoreAnchor();
    }
  }, [open]);

  // Når vi åbner med focus:'customer', skal Kunden-picker autoåbne
  const [autoOpenCustomer, setAutoOpenCustomer] = useState(false);

  // Vagt mod dobbelt-open i StrictMode
  const lastOpenRef = useRef<{ id: string | null; t: number }>({ id: null, t: 0 });

  // Abonner på åbning/luk (event bus)
  useEffect(() => {
    const unsubscribe = subscribeEditorOpen(
      (id, opts) => {
        const now = Date.now();
        const last = lastOpenRef.current;
        if (last.id === id && now - last.t < 300) return; // ignorer dublet
        lastOpenRef.current = { id, t: now };

        const active = document.activeElement as HTMLElement | null;
        useCalendar.getState().setFocusAnchor(active);

        setEventId(id);
        setOpen(true);
        setAutoOpenCustomer(opts?.focus === 'customer');
      },
      () => setOpen(false)
    );

    return unsubscribe;
  }, []);

  // Hydrér form når event ændrer sig
  useEffect(() => {
    if (!ev) return;
    setSelection({ eventId: ev.id });
    setForm({
      title: ev.title || SERVICE_META[ev.serviceType]?.label || 'Ny aftale',
      serviceType: ev.serviceType,
      staffId: ev.staffId,
      customerId: ev.customerId as CustomerId | undefined,
      dateISO: sameDayISO(ev.start),
      start: toHHMM(new Date(ev.start)),
      end: toHHMM(new Date(ev.end)),
      status: ev.status,
      notes: ev.notes ?? '',
    });
  }, [ev, setSelection]);

  const onClose = useCallback(() => {
    setOpen(false);
    setAutoOpenCustomer(false);
    setTimeout(() => setEventId(null), 200);
  }, []);

  const endInvalid = form
    ? new Date(setTimeOnISO(form.dateISO, form.end)) <=
      new Date(setTimeOnISO(form.dateISO, form.start))
    : false;

  const save = useCallback(async () => {
    if (!eventId || !form) return;
    const startISO = setTimeOnISO(form.dateISO, form.start);
    const endISO = setTimeOnISO(form.dateISO, form.end);
    const patch: Partial<CalendarEvent> = {
      title: form.title,
      serviceType: form.serviceType,
      staffId: form.staffId as StaffId,
      start: startISO,
      end: endISO,
      status: form.status,
      notes: form.notes,
    };
    if (form.customerId !== undefined) {
      patch.customerId = form.customerId;
    }
    await update(eventId, patch);
    onClose();
  }, [eventId, form, update, onClose]);

  // ⌘/Ctrl+S + ⌘/Ctrl+F (fokus på Kunde)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;

      // Gem
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's';
      if (isSave) {
        e.preventDefault();
        if (!endInvalid) void save();
        return;
      }

      // Fokusér “Kunde”
      const isFind = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f';
      if (isFind) {
        e.preventDefault();
        setAutoOpenCustomer(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, endInvalid, save]); // form behøver ikke være i deps

  if (!form) {
    return (
      <AlertDialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
        <AlertDialogContent className="bg-white/85 backdrop-blur-md border border-hair rounded-xl shadow-lg" />
      </AlertDialog>
    );
  }

  const svcMeta = SERVICE_META[form.serviceType] ?? SERVICE_META.other;

  const nowRange = fmtRange(
    setTimeOnISO(form.dateISO, form.start),
    setTimeOnISO(form.dateISO, form.end)
  );

  return (
    <AlertDialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <AlertDialogContent className="bg-white/85 backdrop-blur-md border border-hair rounded-xl shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Rediger aftale</AlertDialogTitle>
          <AlertDialogDescription>Opdater detaljer for kunden og aftalen.</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Hvad */}
        <div className="mt-1 mb-3 rounded-md border border-hair/60 bg-white/70 p-3">
          <div className="text-[12px] font-medium text-zinc-500 mb-2">Aftale</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="sm:col-span-2">
              <label className="text-[12px] text-zinc-600 mb-1 block">Titel</label>
              <input
                className="tahoe-input w-full"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[12px] text-zinc-600 mb-1 block">Type</label>
              <select
                className="tahoe-input w-full"
                value={form.serviceType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, serviceType: e.target.value as Form['serviceType'] })
                }
              >
                {Object.values(SERVICE_META).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-zinc-600 mb-1 block">Medarbejder</label>
              <select
                className="tahoe-input w-full"
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hvem */}
        <div className="mb-3 rounded-md border border-hair/60 bg-white/70 p-3">
          <div className="text-[12px] font-medium text-zinc-500 mb-2">Kunde</div>
          <CustomerPicker
            withinDialog
            autoOpen={autoOpenCustomer}
            value={form.customerId}
            onChange={(id) => setForm({ ...form, customerId: id })}
          />
        </div>

        {/* Hvornår */}
        <div className="mb-2 rounded-md border border-hair/60 bg-white/70 p-3">
          <div className="text-[12px] font-medium text-zinc-500 mb-2">Tid</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[12px] text-zinc-600 mb-1 block">Dato</label>
              <input
                type="date"
                className="tahoe-input w-full"
                value={new Date(form.dateISO).toISOString().slice(0, 10)}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  d.setHours(0, 0, 0, 0);
                  setForm({ ...form, dateISO: d.toISOString() });
                }}
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-600 mb-1 block">Start</label>
              <input
                type="time"
                className="tahoe-input w-full"
                step={300}
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-600 mb-1 block">Slut</label>
              <input
                type="time"
                className="tahoe-input w-full"
                step={300}
                value={form.end}
                min={form.start}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
              {endInvalid && (
                <div className="text-[11px] text-red-600 mt-1">Sluttid skal være efter start.</div>
              )}
            </div>
            <div>
              <label className="text-[12px] text-zinc-600 mb-1 block">Status</label>
              <select
                className="tahoe-input w-full"
                value={form.status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, status: e.target.value as Form['status'] })
                }
              >
                <option value="booked">Booket</option>
                <option value="checked_in">Check ind</option>
                <option value="completed">Fuldført</option>
                <option value="tentative">Foreløbig</option>
                <option value="no_show">Udeblevet</option>
                <option value="cancelled">Annulleret</option>
              </select>
            </div>
          </div>

          <div className="text-[12px] text-zinc-600 mt-2">
            <span className="text-zinc-500">Aktuel tid:</span>{' '}
            <span className="font-medium">{nowRange}</span> <span className="text-zinc-400">•</span>{' '}
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `hsl(${svcMeta.hue})` }}
              />
              {svcMeta.label}
            </span>
          </div>
        </div>

        {/* Noter */}
        <div className="mb-2 rounded-md border border-hair/60 bg-white/70 p-3">
          <div className="text-[12px] font-medium text-zinc-500 mb-1">Noter</div>
          <textarea
            className="tahoe-input w-full h-28"
            placeholder="Noter, URL eller vedhæftninger"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:justify-end">
          <Button
            variant="ghost"
            className="tahoe-ghost"
            onClick={() => {
              closeEventEditor();
              onClose();
            }}
          >
            Annullér
          </Button>
          <Button disabled={endInvalid} onClick={save}>
            Gem
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
