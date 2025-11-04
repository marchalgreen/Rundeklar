'use client';

import MiniMonth from './parts/MiniMonth';
import { useCalendar } from '@/store/calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SERVICE_META } from './parts/services';
import { AnimatePresence, motion } from 'framer-motion';

export default function MiniSidebar() {
  const { dateISO, setDate } = useCalendar();
  const d = new Date(dateISO);

  const goMonth = (delta: number) => {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + delta);
    setDate(nd.toISOString());
  };

  // Detect if shown date is today (local)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shownIsToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  return (
    <div className="h-full overflow-hidden">
      {/* Month header + nav */}
      <div className="p-3 border-b border-transparent">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium">
            {d.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1">
            <button className="tahoe-ghost" onClick={() => goMonth(-1)} aria-label="Forrige måned">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="tahoe-ghost" onClick={() => goMonth(1)} aria-label="Næste måned">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2">
          <MiniMonth />
        </div>

        {/* Fixed height area to prevent layout jumps */}
        <div className="mt-3 h-[34px] relative">
          <AnimatePresence mode="wait" initial={false}>
            {!shownIsToday && (
              <motion.button
                key="goto-today"
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0 w-full tahoe-ghost border-sky-500 text-sky-600 font-medium transition"
                onClick={() => setDate(new Date().toISOString())}
              >
                Gå til i dag
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Event types */}
      <div className="p-3">
        <div className="text-[12px] font-semibold text-zinc-500 uppercase mb-2 pb-2">
          Begivenhedstype
        </div>
        <ul className="space-y-2 text-[13px]">
          {Object.values(SERVICE_META).map((meta) => {
            const Icon = meta.Icon;
            return (
              <li key={meta.key} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `hsl(${meta.hue})` }}
                />
                <Icon size={16} weight="bold" style={{ color: `hsl(${meta.hue})` }} />
                <span className="text-zinc-800">{meta.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
