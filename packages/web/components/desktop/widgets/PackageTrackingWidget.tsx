'use client';

import React, { useState } from 'react';
import WidgetShell from './WidgetShell';
import PreviewChrome from './PreviewChrome';
import type { WidgetTone } from '@/store/widgets';
import { cn } from '@/lib/utils/cn';
import { MOCK_PACKAGES } from '@/lib/mock/widgets/packages.mock';

type ParcelStatus = 'in_transit' | 'delivered' | 'delayed' | 'exception';
type History = { ts: string; label: string };
type Parcel = {
  id: string;
  vendor: string;
  carrier: string;
  status: ParcelStatus;
  progress: number;
  eta?: string;
  history?: History[];
};

const CHIP: Record<ParcelStatus, { text: string; cls: string }> = {
  in_transit: { text: 'På vej', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-300/60' },
  delivered: { text: 'Leveret', cls: 'bg-sky-500/15 text-sky-700 border-sky-300/60' },
  delayed: { text: 'Forsinket', cls: 'bg-amber-500/15 text-amber-700 border-amber-300/60' },
  exception: { text: 'Fejl', cls: 'bg-rose-500/15 text-rose-700 border-rose-300/60' },
};

function PackageTrackingBody({
  parcels,
  preview = false,
}: {
  parcels: Parcel[];
  preview?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(preview ? null : null);

  return (
    <div className="space-y-3">
      {parcels.map((p) => {
        const open = !preview && openId === p.id;
        return (
          <div
            key={p.id}
            className="rounded-lg border border-white/60 bg-white/60 px-2 py-2 hover:bg-white/70 transition"
          >
            <button
              onClick={() => !preview && setOpenId((cur) => (cur === p.id ? null : p.id))}
              className="w-full text-left"
              disabled={preview}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-zinc-900 truncate">{p.vendor}</div>
                  <div className="text-[12px] text-zinc-500 truncate">{p.id}</div>
                  <div className="text-[11px] text-zinc-400">
                    Fragtselskab {p.carrier}
                    {p.eta ? ` · ${p.eta}` : ''}
                  </div>
                </div>
                <span
                  className={cn(
                    'ml-2 inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-medium',
                    CHIP[p.status].cls,
                  )}
                >
                  {CHIP[p.status].text}
                </span>
              </div>
              <div className="mt-2 h-[2px] w-full bg-zinc-200/70 rounded">
                <div
                  className="h-full rounded bg-sky-500"
                  style={{ width: `${Math.max(0, Math.min(100, p.progress * 100))}%` }}
                />
              </div>
            </button>
            {open && p.history && (
              <div className="mt-2 border-t border-white/60 pt-2 space-y-1">
                {p.history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[12px] text-zinc-700"
                  >
                    <div>{h.label}</div>
                    <div className="text-zinc-400">{h.ts}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PackageTrackingWidgetPreview({ tone }: { tone?: WidgetTone }) {
  return (
    <PreviewChrome
      title="Pakkesporing"
      tone={tone ?? 'secondary'}
      width={380}
      height={260}
      scale={0.92}
    >
      <PackageTrackingBody parcels={MOCK_PACKAGES as Parcel[]} preview />
    </PreviewChrome>
  );
}

export default function PackageTrackingWidget() {
  const parcels = MOCK_PACKAGES as Parcel[];
  return (
    <WidgetShell id="packageTracking" title="Pakkesporing" tone="secondary">
      <PackageTrackingBody parcels={parcels} />
    </WidgetShell>
  );
}
