'use client';

import React, { useEffect, useState } from 'react';
import WidgetShell from './WidgetShell';
import PreviewChrome from './PreviewChrome';
import { useDesktop } from '@/store/desktop';
import type { WidgetTone } from '@/store/widgets';
import { cn } from '@/lib/utils/cn';
import { MOCK_SCHEDULE } from '@/lib/mock/widgets/schedule.mock';
import { SERVICE_META } from '@/components/calendar/parts/services'; // labels, icons, hues

type ServiceKey = keyof typeof SERVICE_META;

type OpenFn = (win: any) => void;

function TodayScheduleBody({
  items,
  open,
  preview = false,
}: {
  items: any[];
  open: OpenFn;
  preview?: boolean;
}) {
  const [nowPct, setNowPct] = useState(0);

  useEffect(() => {
    if (preview) {
      setNowPct(68); // fixed marker for gallery
      return;
    }
    const calc = () => {
      const start = 9 * 60,
        end = 17 * 60;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const pct = Math.max(0, Math.min(100, ((mins - start) / (end - start)) * 100));
      setNowPct(isFinite(pct) ? pct : 0);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [preview]);

  const metaFor = (t?: string) => {
    if (!t) return undefined;
    const byKey = SERVICE_META[t as ServiceKey];
    if (byKey) return byKey;
    return Object.values(SERVICE_META).find((m) => m.label === t);
  };

  const railLeft = '0.75rem';
  const dotLeft = 'calc(0.75rem - 2px)';

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-sky-500/20 rounded" />

      <div className="absolute inset-x-0 pointer-events-none" style={{ top: `${nowPct}%` }}>
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background: 'hsl(var(--svc-repair))',
            opacity: 0.25,
            transform: 'translateY(-0.5px)',
          }}
        />
        <div
          className="absolute h-[8px] w-[8px] rounded-full"
          style={{
            left: dotLeft,
            transform: 'translateY(-50%)',
            background: 'hsl(var(--svc-repair))',
            boxShadow:
              '0 0 0 1px #fff, 0 0 0 3px color-mix(in oklab, hsl(var(--svc-repair)) 38%, transparent)',
          }}
          aria-hidden
        />
      </div>

      <div className="space-y-2 pl-6">
        {items.map((it: any) => {
          const meta = metaFor(it.type);
          const rowStyle: React.CSSProperties | undefined = meta
            ? ({ ['--evt' as any]: meta.hue } as React.CSSProperties)
            : undefined;

          return (
            <button
              key={it.time + it.name}
              disabled={it.blocked}
              onClick={() =>
                (open as OpenFn)({
                  type: 'booking_calendar',
                  title: 'Kalender',
                  payload: { highlight: it.time },
                })
              }
              style={rowStyle}
              className={cn(
                'relative w-full text-left rounded-lg px-3 py-2 transition',
                it.blocked
                  ? 'opacity-60 cursor-default'
                  : it.active
                    ? 'bg-sky-600/15 ring-1 ring-sky-400/40 text-zinc-900'
                    : 'hover:bg-white/60',
              )}
            >
              {meta && (
                <span
                  aria-hidden
                  className="absolute top-1.5 bottom-1.5 l w-[3px] rounded-full"
                  style={{
                    left: `calc(${railLeft} - 10px)`,
                    background: 'hsl(var(--evt) / 0.55)',
                  }}
                />
              )}

              <div className="flex items-center gap-3">
                <div className="tabular-nums w-12 text-[13px] text-zinc-600">{it.time}</div>
                <div className="flex-1 text-[14px] font-medium">{it.name}</div>

                {meta && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
                    style={{
                      borderColor: 'hsl(var(--evt) / 0.45)',
                      color: 'hsl(var(--evt))',
                      background: 'hsl(var(--evt) / 0.10)',
                    }}
                  >
                    <meta.Icon size={14} weight="regular" />
                    {meta.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Preview version — supports tone prop
   ────────────────────────────────────────────────────────────── */
export function TodayScheduleWidgetPreview({ tone }: { tone?: WidgetTone }) {
  const items = MOCK_SCHEDULE;
  const noop = () => {};
  return (
    <PreviewChrome
      title="Dagens kalender"
      tone={tone ?? 'primary'}
      width={360}
      height={320}
      scale={0.92}
    >
      <TodayScheduleBody items={items} open={noop as any} preview />
    </PreviewChrome>
  );
}

/* ──────────────────────────────────────────────────────────────
   Live widget version
   ────────────────────────────────────────────────────────────── */
export default function TodayScheduleWidget() {
  const open = useDesktop((s) => s.open);
  const items = MOCK_SCHEDULE;

  return (
    <WidgetShell id="todaySchedule" title="Dagens kalender" tone="primary">
      <TodayScheduleBody items={items} open={open} />
    </WidgetShell>
  );
}
