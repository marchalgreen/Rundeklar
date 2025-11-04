'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Tab = { key: string; label: string };
type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 mt-1 mb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            'tahoe-ghost h-8 px-3 text-[12px] relative transition-colors',
            active === t.key && 'bg-white ring-1 ring-[hsl(var(--accent-blue))]',
          )}
        >
          {t.label}
          {active === t.key && (
            <motion.span
              layoutId="tab-underline"
              className="absolute left-2 right-2 -bottom-[2px] h-[2px] rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent, hsl(var(--accent-blue)), transparent)',
              }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
