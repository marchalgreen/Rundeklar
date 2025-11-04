'use client';

import * as React from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalendar } from '@/store/calendar';

type DayCell = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

const WEEKDAY_LABELS_DA = ['Man', 'Tirs', 'Ons', 'Tors', 'Fre', 'Lør', 'Søn'];

export default function MiniMonth() {
  const { dateISO, setDate } = useCalendar();
  const current = useMemo(() => new Date(dateISO), [dateISO]);

  // slide direction
  const prevKeyRef = useRef<string>(yyyymmKey(current));
  const dirRef = useRef<1 | -1>(1);
  const key = yyyymmKey(current);
  if (key !== prevKeyRef.current) {
    const prev = keyToDate(prevKeyRef.current);
    dirRef.current = monthDiff(prev, current) > 0 ? 1 : -1;
    prevKeyRef.current = key;
  }
  const dir = dirRef.current;

  const grid = useMemo(() => buildMonthGrid(current, dateISO), [current, dateISO]);

  const handleSelect = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    setDate(nd.toISOString());
  };

  // lock height to avoid overlap during animation
  const measureRef = useRef<HTMLDivElement>(null);
  const [lockedH, setLockedH] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (!measureRef.current) return;
    setLockedH(measureRef.current.offsetHeight);
  }, [key]);

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 text-[11px] text-zinc-500">
        {WEEKDAY_LABELS_DA.map((w) => (
          <div key={w} className="py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden" style={lockedH ? { height: lockedH } : undefined}>
        {/* hidden measurer */}
        <div
          ref={measureRef}
          aria-hidden
          className="invisible absolute left-0 top-0 w-full grid grid-cols-7 gap-y-1"
        >
          {grid.map((c, i) => (
            <DayButton key={`m-${i}`} cell={c} onSelect={() => {}} measuring />
          ))}
        </div>

        <AnimatePresence initial={false} custom={dir} mode="sync">
          <motion.div
            key={key}
            custom={dir}
            initial={{ x: dir * 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 36, opacity: 0 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.18 }}
            className="absolute inset-0 grid grid-cols-7 gap-y-1"
          >
            {grid.map((cell, i) => (
              <DayButton key={i} cell={cell} onSelect={handleSelect} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- Day Button ---------- */
function DayButton({
  cell,
  onSelect,
  measuring = false,
}: {
  cell: DayCell;
  onSelect: (d: Date) => void;
  measuring?: boolean;
}) {
  const { date, inMonth, isToday, isSelected } = cell;

  const base =
    'mx-auto my-[2px] flex h-7 w-7 items-center justify-center rounded-lg text-[12px] transition';
  const mutedText = inMonth ? 'text-zinc-800' : 'text-zinc-400';

  // Styles:
  // - Selected: solid sky pill, white text.
  // - Today (not selected): white bg, sky text, bold, sky ring. Clearly different from selected.
  // - Normal: subtle hover.
  const style = isSelected
    ? 'bg-sky-500 text-white font-semibold shadow-sm'
    : isToday
    ? 'bg-white text-sky-600 font-bold ring-2 ring-sky-500'
    : 'hover:bg-zinc-100';

  return (
    <button
      type="button"
      className={['h-8 w-full text-center', !inMonth ? 'opacity-60' : ''].join(' ')}
      onClick={measuring ? undefined : () => onSelect(date)}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={isSelected}
      tabIndex={measuring ? -1 : 0}
      title={date.toLocaleDateString('da-DK', { dateStyle: 'full' })}
    >
      <div className={[base, mutedText, style].join(' ')}>{date.getDate()}</div>
    </button>
  );
}

/* ---------- Helpers ---------- */
function buildMonthGrid(currentDate: Date, selectedISO: string): DayCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const first = new Date(year, month, 1);
  const firstWeekDay = weekIndexMondayFirst(first);
  const start = new Date(first);
  start.setDate(first.getDate() - firstWeekDay);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(selectedISO);
  selected.setHours(0, 0, 0, 0);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const d0 = new Date(d);
    d0.setHours(0, 0, 0, 0);

    const inMonth = d.getMonth() === month;
    const isToday = d0.getTime() === today.getTime();
    const isSelected = d0.getTime() === selected.getTime();

    cells.push({ date: d, inMonth, isToday, isSelected });
  }
  return cells;
}

function weekIndexMondayFirst(d: Date): number {
  const i = d.getDay();
  return (i + 6) % 7;
}
function yyyymmKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function keyToDate(key: string): Date {
  const [y, m] = key.split('-').map((s) => parseInt(s, 10));
  return new Date(y, m - 1, 1);
}
function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
