'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCalendar } from '@/store/calendar';
import { Switch } from '@/components/ui/switch';

const LS_KEY_WEEK_STARTS_TODAY = 'clarity.weekStartsToday';

export default function CalendarToolbar() {
  const { view, setView, dateISO, setDate } = useCalendar();
  const d = useMemo(() => new Date(dateISO), [dateISO]);

  // Persisted local toggle (ingen store-ændring nødvendig)
  const [weekStartsToday, setWeekStartsToday] = useState<boolean>(false);
  useEffect(() => {
    const raw =
      typeof window !== 'undefined' ? localStorage.getItem(LS_KEY_WEEK_STARTS_TODAY) : null;
    if (raw === '1') setWeekStartsToday(true);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY_WEEK_STARTS_TODAY, weekStartsToday ? '1' : '0');
    }
  }, [weekStartsToday]);

  const title = useMemo(() => {
    if (view === 'week') {
      const start = weekStartsToday ? startOfDay(d) : startOfWeekMonday(d);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const monthStr = start.toLocaleDateString('da-DK', { month: 'long' });
      const endMonthStr = end.toLocaleDateString('da-DK', { month: 'long' });
      const yearStr = start.getFullYear();
      return sameMonth
        ? `${start.getDate()}.–${end.getDate()}. ${monthStr} ${yearStr}`
        : `${start.getDate()}. ${monthStr} – ${end.getDate()}. ${endMonthStr} ${yearStr}`;
    }
    if (view === 'month') {
      return d.toLocaleDateString('da-DK', { year: 'numeric', month: 'long' });
    }
    return d.toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' });
  }, [d, view, weekStartsToday]);

  const step = (n: number) => {
    const nd = new Date(d);
    if (view === 'week') nd.setDate(nd.getDate() + n * 7);
    else if (view === 'month') nd.setMonth(nd.getMonth() + n);
    else nd.setDate(nd.getDate() + n);
    setDate(nd.toISOString());
  };

  const goToday = () => {
    const now = new Date();
    setDate(now.toISOString());
    // Bed WeekGrid om at centrere “i dag” vandret
    if (view === 'week' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clarity:scrollToToday'));
    }
  };

  return (
    <div className="bg-paper/85 backdrop-blur pt-3 pb-2 px-4 border-b border-transparent">
      <div className="flex items-center justify-between gap-3">
        {/* Titel */}
        <div className="text-[22px] font-semibold">{title}</div>

        {/* Segment (Dag / Uge / Måned) */}
        <div
          className="
            inline-flex rounded-full border border-hair bg-white/70 backdrop-blur px-1
            shadow-sm
          "
          role="tablist"
          aria-label="Kalendervisning"
        >
          <button
            role="tab"
            aria-selected={view === 'day'}
            onClick={() => setView('day')}
            className={[
              'px-3 py-1.5 text-sm rounded-full transition',
              view === 'day'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-zinc-700 hover:bg-zinc-100',
            ].join(' ')}
          >
            Dag
          </button>
          <button
            role="tab"
            aria-selected={view === 'week'}
            onClick={() => setView('week')}
            className={[
              'px-3 py-1.5 text-sm rounded-full transition',
              view === 'week'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-zinc-700 hover:bg-zinc-100',
            ].join(' ')}
          >
            Uge
          </button>
          <button
            role="tab"
            aria-selected={view === 'month'}
            onClick={() => setView('month')}
            className={[
              'px-3 py-1.5 text-sm rounded-full transition',
              view === 'month'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-zinc-700 hover:bg-zinc-100',
            ].join(' ')}
          >
            Måned
          </button>
        </div>

        {/* Navigation + uge-start */}
        <div className="flex items-center gap-3">
          {view === 'week' && (
            <label className="flex items-center gap-2 text-[13px] text-zinc-700 select-none">
              <Switch
                checked={weekStartsToday}
                onCheckedChange={setWeekStartsToday}
                aria-label="Start uge i dag"
              />
              <span>Start uge i dag</span>
            </label>
          )}

          <div className="flex gap-1">
            <button onClick={() => step(-1)} className="tahoe-ghost" aria-label="Forrige">
              ←
            </button>
            <button onClick={() => step(1)} className="tahoe-ghost" aria-label="Næste">
              →
            </button>
            <button onClick={goToday} className="tahoe-ghost" aria-label="Gå til i dag">
              I dag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function startOfWeekMonday(d: Date) {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
}
function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
