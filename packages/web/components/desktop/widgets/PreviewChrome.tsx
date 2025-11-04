'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import type { WidgetTone } from '@/store/widgets';

const toneCls = (tone: WidgetTone | undefined) =>
  tone === 'primary' ? 'bg-white/70 backdrop-blur-2xl' : 'bg-white/55 backdrop-blur-lg';

export default function PreviewChrome({
  title,
  tone = 'secondary',
  width,
  height,
  scale = 0.92,
  children,
}: {
  title: string;
  tone?: WidgetTone;
  width: number;
  height: number;
  scale?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/50 ring-1 ring-white/50 shadow-[0_12px_40px_rgba(0,0,0,.08)]',
        toneCls(tone),
        'overflow-hidden',
      )}
      style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}
    >
      {/* Titlebar (non-draggable) */}
      <div className="select-none flex items-center justify-between px-3 py-2 border-b border-white/50 bg-white/30">
        <div className="relative">
          <div className="text-[13px] font-semibold text-zinc-800">{title}</div>
          <div className="absolute inset-x-0 top-[18px] h-[1.25px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Body scaled (so widget can keep its normal padding/layout) */}
      <div className="p-3 overflow-hidden" style={{ width, height: height - 40 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  );
}
