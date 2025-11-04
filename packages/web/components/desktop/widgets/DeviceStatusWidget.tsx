'use client';

import React, { useEffect, useRef } from 'react';
import WidgetShell from './WidgetShell';
import PreviewChrome from './PreviewChrome';
import type { WidgetTone } from '@/store/widgets';
import { cn } from '@/lib/utils/cn';
import { MOCK_DEVICES } from '@/lib/mock/widgets/devices.mock';

type DeviceStatus = 'connected' | 'disconnected' | 'error';
type Device = { id: string; name: string; status: DeviceStatus; note?: string };

const COLORS: Record<DeviceStatus, { dot: string; text: string }> = {
  connected: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  disconnected: { dot: 'bg-rose-500', text: 'text-rose-700' },
  error: { dot: 'bg-amber-500', text: 'text-amber-700' },
};

function DeviceStatusBody({ devices, preview = false }: { devices: Device[]; preview?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (preview) return;
    const host = ref.current;
    if (!host) return;
    const el = host.querySelector<HTMLElement>('[data-ripple]');
    el?.animate(
      [
        { boxShadow: '0 0 0 0 rgba(16,185,129,.3)' },
        { boxShadow: '0 0 0 12px rgba(16,185,129,0)' },
      ],
      { duration: 600, easing: 'ease-out' },
    );
  }, [preview]);

  return (
    <div ref={ref} className="space-y-3">
      {devices.map((d, i) => (
        <div key={d.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              data-ripple={!preview && i === 0 ? '' : undefined}
              className={cn('inline-block h-2.5 w-2.5 rounded-full', COLORS[d.status].dot)}
            />
            <div className="text-[14px] text-zinc-800">{d.name}</div>
          </div>
          <div className={cn('text-[12px]', COLORS[d.status].text)}>{d.note}</div>
        </div>
      ))}
    </div>
  );
}

export function DeviceStatusWidgetPreview({ tone }: { tone?: WidgetTone }) {
  return (
    <PreviewChrome
      title="Enhedsstatus"
      tone={tone ?? 'secondary'}
      width={380}
      height={220}
      scale={0.92}
    >
      <DeviceStatusBody devices={MOCK_DEVICES as Device[]} preview />
    </PreviewChrome>
  );
}

export default function DeviceStatusWidget() {
  const devices = MOCK_DEVICES as Device[];
  return (
    <WidgetShell id="deviceStatus" title="Enhedsstatus" tone="secondary">
      <DeviceStatusBody devices={devices} />
    </WidgetShell>
  );
}
