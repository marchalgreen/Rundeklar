// src/components/windows/SynsJournal/TwentyOneView.tsx
'use client';

import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import type { TwentyOneState } from './types';

/* --------------------------- small UI helpers --------------------------- */

function Card({
  hue,
  children,
  className,
}: {
  hue: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-xl border border-border card-surface p-3', className)}
      style={{ boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }}
    >
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      autoComplete="off"
      className={cn('tahoe-input h-8 w-full', className)}
      // Prevent drag/resize layers from swallowing taps/clicks
      onPointerDownCapture={(e) => {
        e.stopPropagation();
        props.onPointerDownCapture?.(e);
      }}
      onMouseDownCapture={(e) => {
        e.stopPropagation();
        props.onMouseDownCapture?.(e);
      }}
      onTouchStartCapture={(e) => {
        e.stopPropagation();
        props.onTouchStartCapture?.(e);
      }}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] text-foreground/65 leading-tight">{children}</div>;
}

function Group({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface/60">
      <div className="flex items-center gap-2 px-3 py-2">
        {icon && <span className="text-foreground/65">{icon}</span>}
        <div className="text-[13px] font-medium text-foreground/85">{title}</div>
      </div>
      <div className="border-t border-border/70 p-3">{children}</div>
    </div>
  );
}

/* ---------------------------- page definition ---------------------------- */
/**
 * We keep your TwentyOneState shape (point01..point21, notes),
 * but present them with clear labels matching the 21-punkts flow.
 *
 * If you later extend the backend model, just replace the mappings below.
 */

type K = keyof TwentyOneState;

// Ordered mapping: labeled field -> underlying point key
const MAP: Array<{
  key: K;
  label: string;
  hint?: string;
  wide?: boolean;
}> = [
  // 1–2 Habituel fori (afstand/nær)
  { key: 'point01', label: '3 — Habituel fori afstand', hint: 'Exo / Eso, Δ' },
  { key: 'point02', label: '13A — Habituel fori nær', hint: 'Exo / Eso, Δ' },

  // 3 Fori v/ m/7 (afstand)
  { key: 'point03', label: '8 — Fori v/ m/7 (afstand)', hint: 'Δ' },

  // 4–5 Adduktion / Rec. (break/recovery)
  { key: 'point04', label: '10 — Adduktion break', hint: 'Δ' },
  { key: 'point05', label: '11 — Adduktion recovery', hint: 'Δ' },

  // 6–7 Pos. relativ konvergens (nær/fjern) – recovery
  { key: 'point06', label: '16A — Pos. relativ konv. (nær)', hint: 'Break / Rec.' },
  { key: 'point07', label: '16B — Pos. relativ konv. (afstand)', hint: 'Break / Rec.' },

  // 8–9 Vertikal fori (afstand/nær)
  { key: 'point08', label: '12 — Vertikal fori (afstand)', hint: 'Hyper / Hypo, Δ' },
  { key: 'point09', label: '12 — Vertikal fori (nær)', hint: 'Hyper / Hypo, Δ' },

  // 10–11 Krydscylinder nær (14A/14B) + Lag
  { key: 'point10', label: '14A — Krydscylinder nær (OD/OS)', hint: '+/–', wide: true },
  { key: 'point11', label: 'Lag (OD/OS)', hint: '+/–' },

  // 12 NRA / 13 PRA / 14 Amplitude
  { key: 'point12', label: 'NRA', hint: '+ diop.' },
  { key: 'point13', label: 'PRA', hint: '− diop.' },
  { key: 'point14', label: 'Akkommodations-amplitude', hint: 'D' },

  // 15–16 Pos/Neg relativ akkommodation
  { key: 'point15', label: '20–22 — Positiv relativ akkommodation', hint: '+ diop.' },
  { key: 'point16', label: '23 — Negativ relativ akkommodation', hint: '− diop.' },

  // 17 Fiksationsdisparitet / 18 Dominans
  { key: 'point17', label: 'Fiksationsdisparitet', hint: 'Δ / retning' },
  { key: 'point18', label: 'Dominans', hint: 'OD / OS' },

  // 19–20 Stereo (nær/afstand) + Rød/grøn noter
  { key: 'point19', label: 'Stereo (nær)', hint: '″', wide: false },
  { key: 'point20', label: 'Stereo (afstand)', hint: '″', wide: false },

  // 21 Øvrigt / kontrolfelt (fri tekst)
  { key: 'point21', label: 'Kontrol / Øvrige fund', hint: 'fri tekst', wide: true },
];

/* ------------------------------ main view ------------------------------ */

type TwentyOneViewProps = {
  value: TwentyOneState;
  onChange: (v: TwentyOneState) => void;
  hue: number;
  variant?: 'standalone' | 'embedded';
};

export default function TwentyOneView({
  value,
  onChange,
  hue,
  variant = 'standalone',
}: TwentyOneViewProps) {
  const set = (k: K) => (val: string) => onChange({ ...value, [k]: val });

  const gridRef = useRef<HTMLDivElement | null>(null);
  const focusIdx = (idx: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(`input[data-idx="${idx}"]`);
    el?.focus();
    el?.select();
  };

  // Split into visual groups similar to the legacy 21-punkt layout
  const g1 = MAP.slice(0, 3); // Habituel fori + m/7
  const g2 = MAP.slice(3, 7); // Adduktion + PRC
  const g3 = MAP.slice(7, 11); // Vertikal + Krydscyl + Lag
  const g4 = MAP.slice(11, 16); // NRA/PRA/Amplitude + Rel. akk.
  const g5 = MAP.slice(16, 20); // Fix.disp + Dominans + Stereo
  const g6 = MAP.slice(20); // Control/Øvrigt

  const renderFields = (fields: typeof MAP, offset: number) => (
    <div
      ref={offset === 0 ? gridRef : undefined}
      className="grid gap-2 md:grid-cols-3"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
    >
      {fields.map((f, i) => {
        const idx = offset + i;
        const val = value[f.key] ?? '';
        return (
          <label key={String(f.key)} className={cn('text-sm', f.wide && 'md:col-span-3')}>
            <FieldLabel>
              {f.label}
              {f.hint ? <span className="text-foreground/50"> — {f.hint}</span> : null}
            </FieldLabel>
            <Input
              data-idx={idx}
              value={val}
              onChange={(e) => set(f.key)(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const next = idx + (e.shiftKey ? -1 : 1);
                  if (next >= 0 && next < MAP.length) focusIdx(next);
                }
              }}
            />
          </label>
        );
      })}
    </div>
  );

  const instructions = (
    <div className="text-[11px] text-foreground/60">Enter ⇢ næste • Shift+Enter ⇠ forrige</div>
  );

  const content = (
    <>
      {variant === 'standalone' && (
        <div className="flex items-center justify-between px-1">
          <div className="text-[13px] font-medium text-foreground/85">21-punkts synsprøve</div>
          {instructions}
        </div>
      )}
      {variant === 'embedded' && (
        <div className="h-px w-full rounded-full bg-accent/20" aria-hidden="true" />
      )}
      <Group title="Fori & konvergens">{renderFields(g1, 0)}</Group>
      <Group title="Adduktion / Recovery & Pos. relativ konvergens">
        {renderFields(g2, g1.length)}
      </Group>
      <Group title="Vertikal fori, krydscylinder & lag">
        {renderFields(g3, g1.length + g2.length)}
      </Group>
      <Group title="Akkommodation">{renderFields(g4, g1.length + g2.length + g3.length)}</Group>
      <Group title="Binokulært: fiksationsdisparitet, dominans & stereo">
        {renderFields(g5, g1.length + g2.length + g3.length + g4.length)}
      </Group>
      <Group title="Kontrol / øvrigt">
        {renderFields(g6, g1.length + g2.length + g3.length + g4.length + g5.length)}
      </Group>
      <div>
        <div className="mb-1 text-xs text-foreground/65">Noter</div>
        <Textarea
          rows={4}
          className="bg-paper"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
          onTouchStartCapture={(e) => e.stopPropagation()}
        />
      </div>
    </>
  );

  if (variant === 'embedded') {
    return <div className="space-y-3">{content}</div>;
  }

  return (
    <Card hue={hue} className="space-y-3">
      {content}
    </Card>
  );
}
