'use client';

import React from 'react';
import WidgetShell from './WidgetShell';
import PreviewChrome from './PreviewChrome';
import type { WidgetTone } from '@/store/widgets';
import { MOCK_ORDERS } from '@/lib/mock/widgets/orders.mock';

const BAR = (s: string) =>
  s === 'awaiting' ? 'bg-amber-400' : s === 'progress' ? 'bg-sky-500' : 'bg-emerald-500';

function OrderQueueBody({ rows }: { rows: typeof MOCK_ORDERS }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="space-y-1">
          <div className="flex items-center justify-between text-[14px]">
            <div className="font-medium">#{r.id}</div>
            <div className="text-[13px] text-zinc-700 truncate max-w-[160px]">{r.customer}</div>
            <div className="text-[12px] text-zinc-600">{r.eta}</div>
          </div>
          <div className="h-[2px] w-full bg-zinc-200/70 rounded">
            <div
              className={`h-full rounded ${BAR(r.status)}`}
              style={{ width: `${Math.max(0, Math.min(100, r.progress * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderQueueWidgetPreview({ tone }: { tone?: WidgetTone }) {
  return (
    <PreviewChrome title="Ordrekø" tone={tone ?? 'secondary'} width={380} height={240} scale={0.92}>
      <OrderQueueBody rows={MOCK_ORDERS} />
    </PreviewChrome>
  );
}

export default function OrderQueueWidget() {
  const rows = MOCK_ORDERS;
  return (
    <WidgetShell id="orderQueue" title="Ordrekø" tone="secondary">
      <OrderQueueBody rows={rows} />
    </WidgetShell>
  );
}
