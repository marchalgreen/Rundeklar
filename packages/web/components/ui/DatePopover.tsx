'use client';

import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* ---------- helpers ---------- */
const isoToDate = (iso?: string) => (iso ? new Date(iso) : undefined);
const dateToISO = (d?: Date) =>
  d
    ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
    : '';

const WEEKDAYS_DA = ['Man', 'Tirs', 'Ons', 'Tors', 'Fre', 'Lør', 'Søn'];
const MONTHS_DA = [
  'januar',
  'februar',
  'marts',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'december',
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfGridMonday(month: Date) {
  const x = startOfMonth(month);
  const dow = (x.getDay() + 6) % 7; // Mon=0..Sun=6
  x.setDate(x.getDate() - dow);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a?: Date, b?: Date) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isToday(d: Date) {
  const t = new Date();
  return isSameDay(d, t);
}

/** Parse dd-mm-yyyy (also allows ., / as separator) -> Date | null */
function parseDDMMYYYY(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]); // 1..12
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  // guard invalid (e.g., 31/02)
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd)
    return null;
  return d;
}

type Props = {
  value?: string; // ISO yyyy-mm-dd
  onChange: (iso: string) => void;
  triggerClassName?: string;
  renderLabel?: (iso?: string) => React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  minYear?: number;
  maxYear?: number;
  /** show manual dd-mm-yyyy input in footer */
  allowManualInput?: boolean;
};

export default function DatePopover({
  value,
  onChange,
  triggerClassName,
  renderLabel,
  side = 'top',
  align = 'start',
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  allowManualInput = true,
}: Props) {
  const committed = isoToDate(value);
  const [open, setOpen] = React.useState(false);

  // local preview selection/month (keeps UI responsive without committing yet)
  const [selectedLocal, setSelectedLocal] = React.useState<Date>(committed ?? new Date());
  const [month, setMonth] = React.useState<Date>(committed ?? new Date());

  // month/year chooser panel
  const [showMonthYear, setShowMonthYear] = React.useState(false);
  const [tempYear, setTempYear] = React.useState<number>((committed ?? new Date()).getFullYear());

  // manual input state (string in dd-mm-yyyy as the user types)
  const [manual, setManual] = React.useState<string>(() =>
    committed ? toDDMMYYYY(selectedLocal) : ''
  );
  const [manualValid, setManualValid] = React.useState<boolean>(!!committed);

  React.useEffect(() => {
    const d = isoToDate(value) ?? new Date();
    setSelectedLocal(d);
    setMonth(d);
    setTempYear(d.getFullYear());
    setManual(value ? toDDMMYYYY(d) : '');
    setManualValid(!!value);
  }, [value]);

  const clampYear = (y: number) => Math.min(Math.max(y, minYear), maxYear);

  const prevMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // grid (6×7)
  const first = startOfGridMonday(month);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(first, i));

  const commitSelect = (d: Date) => {
    onChange(dateToISO(d));
    setOpen(false);
  };

  // format to dd-mm-yyyy for input
  function toDDMMYYYY(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  const onManualChange = (s: string) => {
    // live-validate and preview-select when valid
    setManual(s);
    const d = parseDDMMYYYY(s.replace(/\s+/g, ''));
    if (d) {
      const y = clampYear(d.getUTCFullYear());
      d.setUTCFullYear(y);
      const local = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
      setManualValid(true);
      setSelectedLocal(local);
      setMonth(new Date(local)); // keep visible month aligned
    } else {
      setManualValid(false);
    }
  };

  const onManualCommit = () => {
    const d = parseDDMMYYYY(manual.replace(/\s+/g, ''));
    if (d) {
      const y = clampYear(d.getUTCFullYear());
      const local = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
      commitSelect(local);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs bg-white hover:bg-zinc-50 transition-transform duration-150 active:scale-[.98]',
            triggerClassName
          )}
        >
          <CalendarIcon size={14} />
          {renderLabel
            ? renderLabel(value)
            : value
            ? new Date(value).toLocaleDateString('da-DK')
            : 'Vælg dato'}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className={cn(
          'z-[100000] w-[336px] rounded-2xl border bg-white shadow-xl',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out',
          'p-0'
        )}
      >
        {/* Header — month label left (Capitalised) */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            type="button"
            className="text-base font-semibold select-none hover:underline underline-offset-4"
            title="Vælg måned og år"
            onClick={() => setShowMonthYear((v) => !v)}
          >
            {cap(MONTHS_DA[month.getMonth()])} {month.getFullYear()}
          </button>

          {!showMonthYear && (
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white hover:bg-zinc-50 active:scale-[.97] transition"
                onClick={prevMonth}
                aria-label="Forrige måned"
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white hover:bg-zinc-50 active:scale-[.97] transition"
                onClick={nextMonth}
                aria-label="Næste måned"
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* MONTH/YEAR PANEL */}
        {showMonthYear ? (
          <div className="px-3 pb-3">
            {/* Year stepper */}
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-zinc-500">Vælg år</div>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white hover:bg-zinc-50 active:scale-[.97]"
                  onClick={() => setTempYear((y) => clampYear(y - 1))}
                  aria-label="Forrige år"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={minYear}
                  max={maxYear}
                  value={tempYear}
                  onChange={(e) => setTempYear(clampYear(Number(e.target.value) || tempYear))}
                  className="h-8 w-[92px] rounded-lg border bg-white px-2 text-center text-sm"
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white hover:bg-zinc-50 active:scale-[.97]"
                  onClick={() => setTempYear((y) => clampYear(y + 1))}
                  aria-label="Næste år"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Month grid (3×4) */}
            <div className="grid grid-cols-3 gap-2">
              {MONTHS_DA.map((mLabel, idx) => {
                const isCurrent = idx === month.getMonth() && tempYear === month.getFullYear();
                return (
                  <button
                    key={mLabel}
                    type="button"
                    className={cn(
                      'h-10 rounded-xl border text-sm capitalize transition-colors',
                      'bg-white hover:bg-zinc-50 active:scale-[.98]',
                      isCurrent && 'border-blue-500 text-blue-700 bg-blue-50'
                    )}
                    onClick={() => {
                      const next = new Date(month);
                      next.setFullYear(tempYear);
                      next.setMonth(idx);
                      setMonth(next);
                      setShowMonthYear(false); // return to day view
                    }}
                  >
                    {cap(mLabel)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Weekday header */}
            <div className="px-3">
              <div className="flex">
                {WEEKDAYS_DA.map((w) => (
                  <div key={w} className="text-zinc-500 w-10 text-[11px] font-medium text-center">
                    {w}
                  </div>
                ))}
              </div>
            </div>

            {/* Day grid */}
            <div className="p-3 pt-1">
              <div className="flex flex-col gap-1">
                {Array.from({ length: 6 }, (_, row) => (
                  <div key={row} className="flex gap-1">
                    {days.slice(row * 7, row * 7 + 7).map((d) => {
                      const outside = d.getMonth() !== month.getMonth();
                      const isSel = isSameDay(d, selectedLocal);
                      const today = isToday(d);
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          onClick={() => commitSelect(d)}
                          className={cn(
                            'h-10 w-10 rounded-xl text-sm font-medium transition-colors',
                            'hover:bg-zinc-100 active:scale-[.98]',
                            outside && 'text-zinc-300',
                            isSel && 'bg-blue-500 text-white shadow-sm hover:bg-blue-500',
                            !isSel && today && 'ring-2 ring-blue-500/60 text-blue-700 bg-blue-50'
                          )}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-3 border-t">
          <button
            className="text-xs text-zinc-600 hover:underline"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Ryd
          </button>

          {allowManualInput && (
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd-mm-yyyy"
              value={manual}
              onChange={(e) => onManualChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onManualCommit();
              }}
              className={cn(
                'h-8 w-[120px] rounded-lg border bg-white px-2 text-center text-xs tracking-wide',
                manual
                  ? manualValid
                    ? 'border-blue-500/60'
                    : 'border-red-400/70'
                  : 'border-zinc-200'
              )}
              title="Skriv dato (dd-mm-yyyy). Enter for at gemme."
            />
          )}

          <button
            className="text-xs text-zinc-600 hover:underline"
            onClick={() => {
              const today = new Date();
              onChange(dateToISO(today));
              setOpen(false);
            }}
          >
            I dag
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
