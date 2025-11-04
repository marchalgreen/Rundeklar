'use client';

import React, { useMemo, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type SegmentedItem = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  ariaLabel?: string;
  ariaControls?: string;
};

export type SegmentedPillsProps = {
  items: SegmentedItem[];
  value: string;
  onChange: (key: string) => void;

  className?: string;
  hue?: number; // optionally tint the active background (hsl hue)
  size?: 'sm' | 'md'; // 'sm' = h-8, 'md' = h-9
  ariaLabel?: string;
  fadeMs?: number; // fade duration (ms), default 180
};

export default function SegmentedPills({
  items,
  value,
  onChange,
  className,
  hue,
  size = 'md',
  ariaLabel = 'Sektioner',
  fadeMs = 180,
}: SegmentedPillsProps) {
  // exact static look you liked
  const ui = useMemo(() => {
    const h = size === 'sm' ? 'h-8' : 'h-9';
    const px = 'px-3';
    const iconBox = size === 'sm' ? 18 : 20; // px space reserved for icon
    const gapPx = 6; // px space between icon and label
    const fill = hue != null ? `hsl(${hue} 90% 95% / 1)` : 'hsl(var(--surface)/.92)';
    const ring =
      hue != null ? `1px solid hsl(${hue} 50% 60% / .45)` : '1px solid hsl(var(--border))';
    return { tabClass: `${h} ${px}`, iconBox, gapPx, fill, ring, fadeMs };
  }, [size, hue, fadeMs]);

  return (
    <div
      className={cn(
        'relative rounded-full border border-border bg-surface/70 px-1.5 py-1 backdrop-blur-sm overflow-hidden',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }}
    >
      <div className="relative flex items-center gap-1.5">
        {items.map((it) => (
          <SegTab
            key={it.key}
            active={it.key === value}
            className={ui.tabClass}
            onClick={() => onChange(it.key)}
            role="tab"
            aria-selected={it.key === value}
            aria-label={it.ariaLabel}
            aria-controls={it.ariaControls}
            iconBox={ui.iconBox}
            gapPx={ui.gapPx}
            fill={ui.fill}
            ring={ui.ring}
            fadeMs={ui.fadeMs}
            icon={it.icon}
            label={it.label}
          />
        ))}
      </div>
    </div>
  );
}

/** A single tab button (active pill fades+scales in; no layout change) */
const SegTab = forwardRef<
  HTMLButtonElement,
  {
    active?: boolean;
    className?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
    label: React.ReactNode;
    iconBox: number; // px width for icon box
    gapPx: number; // px gap between icon and label
    fill: string; // active background
    ring: string; // active ring/border
    fadeMs: number; // fade duration
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    { active, className, onClick, icon, label, iconBox, gapPx, fill, ring, fadeMs, ...rest },
    ref
  ) => {
    const hasIcon = !!icon;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          'relative inline-flex items-center rounded-full text-[13px] font-medium select-none transition-colors',
          'px-3',
          'focus:outline-none',
          active ? 'text-foreground' : 'text-foreground/70 hover:text-foreground',
          className
        )}
        {...rest}
      >
        {/* Active pill background (absolute) with visible fade */}
        <span
          aria-hidden
          className="absolute inset-0 z-0 rounded-full pointer-events-none"
          style={{
            // make the fade very apparent by combining opacity + slight scale
            opacity: active ? 1 : 0,
            transform: active ? 'scale(1)' : 'scale(0.98)',
            background: fill,
            border: ring,
            boxShadow: '0 2px 6px rgba(0,0,0,.06)',
            transition: `opacity ${fadeMs}ms cubic-bezier(.2,.8,.2,1), transform ${fadeMs}ms cubic-bezier(.2,.8,.2,1)`,
            willChange: 'opacity, transform',
          }}
        />

        {/* Content: icon box + gap + label + right spacer (iconBox + gapPx) */}
        <span className="relative z-10 inline-flex items-center">
          {hasIcon ? (
            <span className="inline-flex justify-center" style={{ width: iconBox }}>
              {icon}
            </span>
          ) : null}

          {hasIcon ? <span style={{ width: gapPx }} aria-hidden /> : null}

          <span className="hidden sm:inline">{label}</span>

          {hasIcon ? (
            <span
              className="inline-flex justify-center"
              style={{ width: iconBox + gapPx }}
              aria-hidden
            />
          ) : null}
        </span>
      </button>
    );
  }
);
SegTab.displayName = 'SegTab';
