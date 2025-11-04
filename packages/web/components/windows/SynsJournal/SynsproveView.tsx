// src/components/windows/SynsJournal/SynsproveView.tsx
'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import type {
  Eye,
  EyeKey,
  RxFieldKey,
  RxRow,
  RxTriplet as SynsJournalRxTriplet,
  SynsproveState,
  TwentyOneState,
} from './types';
import TwentyOneView from './TwentyOneView';
import { SectionCard } from './SectionCard';
import { CollapsibleSection } from './CollapsibleSection';

// Icons
import {
  ArrowsLeftRight,
  ClockCounterClockwise,
  Camera,
  Flashlight,
  SealCheck,
  ClipboardText,
  Ruler,
  SquaresFour,
} from '@phosphor-icons/react';

/* ========================== Types & helpers ========================== */

export type Rx = RxRow;
export type RxTriplet = SynsJournalRxTriplet;
export type Synsprove = SynsproveState;

type TripletEye = EyeKey;

export function emptyTriplet(): RxTriplet {
  return { OD: {}, OS: {}, OU: {} };
}

const SECTION_META = [
  { id: 'autorefraktor', label: 'Objektiv refraktion' },
  { id: 'retinoskopi', label: 'Retinoskopi' },
  { id: 'subjektiv', label: 'Subjektiv bedste visus' },
  { id: 'binokulaer', label: 'Binokulær & akkommodation' },
  { id: 'twentyone', label: 'Udvidet samsyn' },
  { id: 'konklusion', label: 'Konklusion & noter' },
] as const;

type SectionId = (typeof SECTION_META)[number]['id'];

/* =========================== Formatting helpers =========================== */

const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const cleanNum = (s: string) =>
  s
    .replace(/[^\d+\-.,]/g, '')
    .replace(',', '.')
    .replace(/(\..*)\./g, '$1'); // single decimal point

function fmtDiopter(raw: string, step = 0.25) {
  const cleaned = cleanNum(raw);
  if (cleaned === '' || cleaned === '+' || cleaned === '-') return '';
  const n = Number(cleaned);
  if (isNaN(n)) return '';
  const r = roundTo(n, step);
  const withSign = r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
  return withSign;
}

function fmtAxis(raw: string) {
  const cleaned = cleanNum(raw).replace(/[+\-]/g, '');
  if (cleaned === '') return '';
  const n = clamp(Math.round(Number(cleaned)), 0, 180);
  return n.toString().padStart(3, '0');
}

function fmtPd(raw: string) {
  const cleaned = cleanNum(raw);
  if (cleaned === '' || cleaned === '+' || cleaned === '-') return '';
  const n = Number(cleaned);
  if (isNaN(n)) return '';
  const r = roundTo(n, 0.5);
  return r.toFixed(2);
}

function fmtPrism(raw: string) {
  const cleaned = cleanNum(raw);
  if (cleaned === '' || cleaned === '+' || cleaned === '-') return '';
  const n = Number(cleaned);
  if (isNaN(n)) return '';
  const r = roundTo(n, 0.5);
  return r.toFixed(2);
}

function fmtVA(raw: string) {
  const cleaned = cleanNum(raw);
  if (cleaned === '' || cleaned === '+' || cleaned === '-') return '';
  const n = Number(cleaned);
  if (isNaN(n)) return '';
  return roundTo(n, 0.1).toFixed(1);
}

type FieldKind = 'diopter' | 'axis' | 'pd' | 'prism' | 'va' | 'text';

function kindFor(field: RxFieldKey | 'OUVA'): FieldKind {
  if (field === 'axis') return 'axis';
  if (field === 'pd') return 'pd';
  if (field === 'prism') return 'prism';
  if (field === 'va' || field === 'OUVA') return 'va';
  if (field === 'sph' || field === 'cyl' || field === 'add') return 'diopter';
  if (field === 'base') return 'text';
  return 'text';
}

function stepFor(kind: FieldKind, e?: KeyboardEvent) {
  if (kind === 'axis') {
    if (e?.altKey) return 10;
    if (e?.shiftKey) return 5;
    return 1;
  }
  if (kind === 'pd') return 0.5;
  if (kind === 'prism') return 0.5;
  if (kind === 'va') return 0.1;
  if (kind === 'diopter') return 0.25;
  return 0;
}

function applyFormat(kind: FieldKind, raw: string) {
  switch (kind) {
    case 'diopter':
      return fmtDiopter(raw);
    case 'axis':
      return fmtAxis(raw);
    case 'pd':
      return fmtPd(raw);
    case 'prism':
      return fmtPrism(raw);
    case 'va':
      return fmtVA(raw);
    default:
      return raw;
  }
}

function bump(kind: FieldKind, raw: string, dir: 1 | -1, e?: KeyboardEvent) {
  const step = stepFor(kind, e);
  if (step === 0) return raw;
  const cleaned = cleanNum(raw);
  const base = cleaned === '' || cleaned === '+' || cleaned === '-' ? 0 : Number(cleaned);
  if (isNaN(base)) return raw;
  let next = base + dir * step;

  if (kind === 'axis') {
    next = clamp(Math.round(next), 0, 180);
    return next.toString().padStart(3, '0');
  }
  if (kind === 'va') return roundTo(next, step).toFixed(1);
  if (kind === 'pd' || kind === 'prism') return roundTo(next, step).toFixed(2);
  if (kind === 'diopter') {
    const r = roundTo(next, step);
    return r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
  }
  return raw;
}

/* =========================== UI atoms =========================== */

function Section({
  title,
  children,
  icon,
  tooltip,
  defaultCollapsed = true,
  onToggle,
  className,
  bodyClassName,
  buttonClassName,
  wrapInCard = false,
  cardHue,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
  defaultCollapsed?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
  bodyClassName?: string;
  buttonClassName?: string;
  wrapInCard?: boolean;
  cardHue?: number;
}) {
  return (
    <CollapsibleSection
      icon={icon}
      title={title}
      tooltip={tooltip}
      defaultCollapsed={defaultCollapsed}
      onToggle={onToggle}
      className={wrapInCard ? className : cn('space-y-3 border-t border-border/60 pt-4', className)}
      bodyClassName={
        wrapInCard
          ? bodyClassName
          : cn('rounded-lg border border-border card-surface', bodyClassName)
      }
      buttonClassName={buttonClassName}
      wrapInCard={wrapInCard}
      cardHue={cardHue}
    >
      {children}
    </CollapsibleSection>
  );
}

const groupClass = 'rounded-xl border border-border card-surface p-3 md:p-4 space-y-3';

function FieldGroup({
  title,
  children,
  description,
  layoutClassName,
}: {
  title: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  layoutClassName?: string;
}) {
  return (
    <div className={groupClass}>
      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium uppercase tracking-wide text-foreground/70">{title}</div>
        {description ? <div className="text-[11px] text-foreground/55">{description}</div> : null}
      </div>
      <div className={cn('grid gap-3 md:gap-4', layoutClassName)}>{children}</div>
    </div>
  );
}

// input tweaks: avoid clipping and keep numbers aligned
type CssVarStyle<K extends string> = React.CSSProperties & Record<K, string | number>;

const buildColsStyle = (cols: number): CssVarStyle<'--rxcols'> => ({
  '--rxcols': cols,
});

/* --------------------------------- Rx Grid --------------------------------- */

const DEFAULT_COLS: RxFieldKey[] = ['sph', 'cyl', 'axis', 'prism', 'base', 'add', 'va', 'pd'];
const COL_LABEL: Record<RxFieldKey, string> = {
  sph: 'Sph',
  cyl: 'Cyl',
  axis: 'Axe',
  prism: 'Prisme',
  base: 'Base',
  va: 'VA',
  add: 'Add',
  pd: 'PD',
};

const COL_WIDTH: Record<LayoutKey, string> = {
  sph: 'min-w-[76px]',
  cyl: 'min-w-[76px]',
  axis: 'min-w-[60px]',
  prism: 'min-w-[70px]',
  base: 'min-w-[72px]',
  add: 'min-w-[76px]',
  va: 'min-w-[60px]',
  OUVA: 'min-w-[60px]',
  pd: 'min-w-[70px]',
};

// synthetic column token for binocular VA
type LayoutKey = RxFieldKey | 'OUVA';

type EyeRxTableProps = {
  title: string;
  value: RxTriplet;
  onChange: (eye: TripletEye, field: RxFieldKey, val: string) => void;
  cols?: RxFieldKey[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
};

const EyeRxTable = React.memo(function EyeRxTable({
  title,
  value,
  onChange,
  cols = DEFAULT_COLS,
  actions,
  icon,
}: EyeRxTableProps) {
  const tableRef = useRef<HTMLDivElement | null>(null);

  // ---------- baseline snapshot (reset via window event) ----------
  const baselineRef = useRef<RxTriplet>(structuredClone(value));
  useEffect(() => {
    const reset = () => (baselineRef.current = structuredClone(value));
    window.addEventListener('synsjournal:saved', reset);
    return () => window.removeEventListener('synsjournal:saved', reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellFrom = (trip: RxTriplet | undefined, eye: TripletEye, field: LayoutKey) => {
    if (!trip) return '';
    if (field === 'OUVA') return (trip.OU?.va as string) || '';
    return (trip[eye as Eye]?.[field as RxFieldKey] as string) || '';
  };

  const isCellChanged = (eye: TripletEye, field: LayoutKey, currentVal: string) => {
    const baseVal = cellFrom(baselineRef.current, eye, field);
    return (baseVal ?? '') !== (currentVal ?? '');
  };

  // Insert OUVA after VA and before PD
  const layout: LayoutKey[] = useMemo(() => {
    const c = cols.slice();
    const iVa = c.indexOf('va');
    if (iVa === -1) return c as LayoutKey[];
    const iPd = c.indexOf('pd');
    const insertAt = iPd >= 0 ? iPd : iVa + 1;
    return [...c.slice(0, insertAt), 'OUVA' as const, ...c.slice(insertAt)] as LayoutKey[];
  }, [cols]);

  const changeField = useCallback(
    (eye: TripletEye, field: RxFieldKey, next: string) => onChange(eye, field, next),
    [onChange]
  );

  // stable indexing + cell key
  const idxFor = (row: number, col: number) => row * layout.length + col;
  const cellKeyFor = (eye: TripletEye, field: LayoutKey) => `${eye}:${field}`;

  /* ── Subtle "held" highlight (very discreet) ─────────────── */
  const HILITE_BG = 'hsl(var(--accent-blue) / 0.03)';
  const HILITE_FADE_MS = 140;

  // per-element timer
  type ElWithBump = HTMLInputElement & { __bumpTO?: number };

  const highlightIn = (el: ElWithBump) => {
    if (el.__bumpTO) {
      clearTimeout(el.__bumpTO);
      el.__bumpTO = undefined;
    }
    el.dataset.bumpActive = '1';
    el.style.transition = 'background-color 90ms cubic-bezier(.2,.8,.2,1)';
    el.style.backgroundColor = HILITE_BG;
  };

  const highlightOut = (el: ElWithBump) => {
    if (el.__bumpTO) clearTimeout(el.__bumpTO);
    el.__bumpTO = window.setTimeout(() => {
      el.style.transition = `background-color ${HILITE_FADE_MS}ms cubic-bezier(.2,.8,.2,1)`;
      el.style.backgroundColor = '';
      delete el.dataset.bumpActive;
      el.__bumpTO = undefined;
    }, 60);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      highlightOut(e.currentTarget as ElWithBump);
    }
  };

  // Robust focus restoration (React re-render safe)
  const refocusSameCell = (cellKey: string, idx: number, caretStart: number, caretEnd: number) => {
    const tryFocus = () => {
      const scope = tableRef.current;
      const target =
        scope?.querySelector<HTMLInputElement>(`input[data-cell-key="${cellKey}"]`) ??
        scope?.querySelector<HTMLInputElement>(`input[data-rx-idx="${idx}"]`);
      if (target) {
        target.focus({ preventScroll: true });
        try {
          target.setSelectionRange(caretStart, caretEnd);
        } catch {}
        highlightIn(target as ElWithBump);
        return true;
      }
      return false;
    };
    requestAnimationFrame(() => {
      if (tryFocus()) return;
      requestAnimationFrame(() => {
        if (tryFocus()) return;
        setTimeout(() => {
          tryFocus();
        }, 0);
      });
    });
  };

  const gotoIdx = (idx: number) => {
    const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-rx-idx="${idx}"]`);
    el?.focus({ preventScroll: true });
    el?.select();
  };

  const gotoNextExisting = (start: number, dir: 1 | -1) => {
    let cur = start + dir;
    const maxHops = layout.length * 2 + 2;
    for (let i = 0; i < maxHops; i++) {
      const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-rx-idx="${cur}"]`);
      if (el) return cur;
      cur += dir;
    }
    return start;
  };

  // Move same column to other row
  const gotoVertical = (idx: number, dir: 1 | -1) => {
    const stride = layout.length;
    const targetIdx = idx + dir * stride;
    const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-rx-idx="${targetIdx}"]`);
    if (el) {
      requestAnimationFrame(() => {
        el.focus({ preventScroll: true });
        el.select();
      });
    }
  };

  const handleKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    eye: TripletEye,
    field: LayoutKey,
    cellKey: string
  ) => {
    const input = e.currentTarget as ElWithBump;
    const kind = kindFor(field);

    // ENTER -> vertical
    if (e.key === 'Enter') {
      e.preventDefault();
      const dir: 1 | -1 = e.shiftKey ? -1 : 1;
      gotoVertical(idx, dir);
      return;
    }

    // UP/DOWN -> bump + keep focus + discreet highlight
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      highlightIn(input);

      const dir: 1 | -1 = e.key === 'ArrowUp' ? 1 : -1;
      const nextVal = bump(kind, input.value, dir, e.nativeEvent as unknown as KeyboardEvent);

      if (field === 'OUVA') changeField('OU', 'va', nextVal);
      else changeField(eye, field, nextVal);

      const start = input.selectionStart ?? nextVal.length;
      const end = input.selectionEnd ?? nextVal.length;

      refocusSameCell(cellKey, idx, start, end);
      return;
    }
  };

  const applyBlurFormat = (field: LayoutKey, raw: string, eye: TripletEye) => {
    const kind = kindFor(field);
    const formatted = applyFormat(kind, raw);
    if (formatted === raw) return;
    if (field === 'OUVA') changeField('OU', 'va', formatted);
    else changeField(eye, field, formatted);
  };

  const HeaderRow = () => (
    <div
      className="grid min-w-max grid-cols-[48px_repeat(var(--rxcols),minmax(auto,1fr))] gap-2"
      style={buildColsStyle(layout.length)}
    >
      <div className="text-xs text-foreground/50" />
      {layout.map((k, i) => (
        <div
          key={`${k}-${i}`}
          className={cn(
            'flex h-6 items-center justify-center select-none text-foreground/65 text-[11px] whitespace-nowrap px-1',
            COL_WIDTH[k]
          )}
        >
          {k === 'OUVA' ? 'OUVA' : COL_LABEL[k as RxFieldKey]}
        </div>
      ))}
    </div>
  );

  const CellInput = ({
    eye,
    field,
    value,
    idx,
  }: {
    eye: TripletEye;
    field: LayoutKey;
    value: RxTriplet;
    idx: number;
  }) => {
    const currentVal =
      field === 'OUVA'
        ? (value?.OU?.va as string) ?? ''
        : ((value?.[eye as Eye]?.[field as RxFieldKey] as string) ?? '');

    const changed = isCellChanged(eye, field, currentVal);
    const kind = kindFor(field);
    const numeric =
      kind === 'diopter' || kind === 'axis' || kind === 'pd' || kind === 'prism' || kind === 'va';
    const cellKey = cellKeyFor(eye, field);

    return (
      <input
        type="text"
        autoComplete="off"
        value={currentVal}
        data-eye={eye}
        data-rx-idx={idx}
        data-cell-key={cellKey}
        inputMode={numeric ? 'decimal' : 'text'}
        className={cn(
          'tahoe-input h-8 w-full px-2 tabular-nums leading-[1.1] tracking-tight text-foreground',
          numeric && 'text-right',
          COL_WIDTH[field]
        )}
        style={
          changed
            ? { boxShadow: 'inset 0 0 0 2px hsl(var(--accent-blue) / 0.24)' }
            : undefined
        }
        onChange={(e) => {
          const raw = e.target.value;
          if (field === 'OUVA') changeField('OU', 'va', raw);
          else changeField(eye as TripletEye, field as RxFieldKey, raw);
        }}
        onBlur={(e) => {
          applyBlurFormat(field, e.currentTarget.value, eye);
          highlightOut(e.currentTarget as ElWithBump);
        }}
        onKeyUp={handleKeyUp}
        onKeyDown={(e) => handleKey(e, idx, eye, field, cellKey)}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
      />
    );
  };

  const Row = ({ eye, rowIndex }: { eye: Eye; rowIndex: number }) => (
    <div
      className="grid min-w-max grid-cols-[48px_repeat(var(--rxcols),minmax(auto,1fr))] gap-2"
      style={buildColsStyle(layout.length)}
    >
      <div className="flex h-8 items-center justify-center rounded-md bg-surface-2 text-xs text-foreground/70 px-2">
        {eye}
      </div>
      {layout.map((k, colIndex) => {
        const idx = idxFor(rowIndex, colIndex);
        if (k === 'OUVA') {
          if (eye === 'OD')
            return <div key={`${eye}-ouva-spacer-${colIndex}`} className={COL_WIDTH.OUVA} />;
          return (
            <div
              key={`${eye}-ouva-${colIndex}`}
              className={cn('flex items-center -mt-10', COL_WIDTH.OUVA)}
            >
              <CellInput eye="OU" field="OUVA" value={value} idx={idx} />
            </div>
          );
        }
        return <CellInput key={`${eye}-${k}-${colIndex}`} eye={eye} field={k} value={value} idx={idx} />;
      })}
    </div>
  );

  return (
    <div className="relative space-y-2" ref={tableRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-foreground/70">{icon}</span>}
          <div className="text-[13px] font-medium text-foreground/85">{title}</div>
        </div>
        {actions}
      </div>
      <div className="overflow-x-auto text-[11px] text-foreground/65">
        <div className="space-y-2 min-w-max">
          <HeaderRow />
          <Row eye="OD" rowIndex={0} />
          <Row eye="OS" rowIndex={1} />
        </div>
      </div>
    </div>
  );
});

/* ============================ Demo Data (same) ============================ */

function t(od: Rx, os: Rx, ou: Rx = {}): RxTriplet {
  return { OD: od, OS: os, OU: ou };
}

export function makeDemoSynsprove(): Synsprove {
  const prev = t(
    { sph: '-0.50', cyl: '-1.25', axis: '10', add: '+1.75', va: '1.0' },
    { sph: '-2.25', cyl: '-1.25', axis: '170', add: '+1.75', va: '0.9' }
  );
  const auto = t(
    { sph: '-0.75', cyl: '-1.25', axis: '10', va: '0.9' },
    { sph: '-2.50', cyl: '-1.25', axis: '170', va: '0.8' }
  );
  const rDist = t(
    { sph: '-0.75', cyl: '-1.00', axis: '10', va: '1.0' },
    { sph: '-2.25', cyl: '-1.00', axis: '170', va: '0.9' }
  );
  const rNear = t(
    { sph: '-0.25', cyl: '-1.00', axis: '10', va: '1.0' },
    { sph: '-1.75', cyl: '-1.00', axis: '170', va: '0.9' }
  );
  const subj = t(
    { sph: '-0.50', cyl: '-1.00', axis: '10', add: '+1.75', va: '1.0' },
    { sph: '-2.00', cyl: '-1.00', axis: '170', add: '+1.75', va: '1.0' }
  );

  const concD = t(
    { sph: '-0.50', cyl: '-1.00', axis: '10', va: '1.0', pd: '32.00' },
    { sph: '-2.00', cyl: '-1.00', axis: '170', va: '1.0', pd: '32.00' }
  );
  const concN = t(
    { sph: '+0.75', cyl: '-1.00', axis: '10', add: '+1.75', va: '1.0', pd: '30.25' },
    { sph: '-0.75', cyl: '-1.00', axis: '170', add: '+1.75', va: '1.0', pd: '30.25' }
  );

  return {
    previousRx: prev,
    autorefractor: auto,
    retinoscopyDist: rDist,
    retinoscopyNear: rNear,
    subjBest: subj,

    foriDistance: 'Eso 2Δ',
    foriNear: 'Exo 4Δ',
    verticalForiFar: 'Hyper 0.5Δ',
    verticalForiNear: 'Hyper 0.5Δ',
    crossCylNear_OD: '+0.25',
    crossCylNear_OS: '+0.50',
    crossCylLag_OD: '+0.25',
    crossCylLag_OS: '+0.50',

    accommodation: { pra: '-2.50', nra: '+2.25', amp: '17D' },
    positiveRelAcc: '20',
    negativeRelAcc: '21',
    fixationDisparity: '0.25Δ',

    stereo: { near: '40″', far: '120″', color: 'Ishihara 14/14', dominantEye: 'OD' },

    pdDistance: '64.00',
    pdNear: '60.50',

    // Start tomme konklusioner i real flow (PD udfyldes separat)
    conclusionDistance: t({}, {}),
    conclusionNear: t({}, {}),
    conclusionTask: t({}, {}),
    conclusionSports: t({}, {}),

    notes: 'Demo-journal til præsentation og QA af workflows.',
  };
}

/* ============================ Main View ============================ */

export default function SynsproveView({
  value,
  onChange,
  setRx,
  hue,
  twentyOne,
  onTwentyOneChange,
}: {
  value: Synsprove;
  onChange: (v: Synsprove) => void;
  setRx: (section: keyof Synsprove, eye: TripletEye, field: RxFieldKey, val: string) => void;
  hue: number;
  twentyOne: TwentyOneState;
  onTwentyOneChange: (v: TwentyOneState) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // ---------- baseline of whole synsprove (for single inputs) ----------
  const baselineAllRef = useRef<Synsprove>(structuredClone(value));
  useEffect(() => {
    const reset = () => (baselineAllRef.current = structuredClone(value));
    window.addEventListener('synsjournal:saved', reset);
    return () => window.removeEventListener('synsjournal:saved', reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isChanged = useCallback(
    (get: (v: Synsprove) => string | undefined) => {
      const cur = get(value) ?? '';
      const base = get(baselineAllRef.current) ?? '';
      return cur !== base;
    },
    [value]
  );

  const set = useCallback(
    (_k: keyof Synsprove) => (patch: Partial<Synsprove>) => onChange({ ...value, ...patch }),
    [onChange, value]
  );

  const copyTriplet = useCallback(
    (from: RxTriplet, toKey: keyof Synsprove) => {
      const current = (value[toKey] ?? { OD: {}, OS: {}, OU: {} }) as RxTriplet;
      const out: RxTriplet = {
        OD: { ...(current.OD ?? {}) },
        OS: { ...(current.OS ?? {}) },
        OU: { ...(current.OU ?? {}) },
      };
      (['OD', 'OS', 'OU'] as EyeKey[]).forEach((eye) => {
        const src = (from?.[eye] ?? {}) as RxRow;
        Object.entries(src).forEach(([k, v]) => {
          const s = typeof v === 'string' ? v.trim() : v;
          if (s != null && s !== '') (out[eye] as Record<string, string | undefined>)[k] = v as string;
        });
      });
      onChange({ ...value, [toKey]: out } as Synsprove);
    },
    [onChange, value]
  );

  const copySubjBestTo = useCallback(
    (to: keyof Synsprove) => copyTriplet(value.subjBest, to),
    [copyTriplet, value.subjBest]
  );

  const [activeSection, setActiveSection] = useState<SectionId>(SECTION_META[0].id);
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>(
    Object.fromEntries(SECTION_META.map(({ id }) => [id, null])) as Record<SectionId, HTMLElement | null>
  );
  const setSectionRef = useCallback(
    (id: SectionId) => (node: HTMLElement | null) => {
      sectionRefs.current[id] = node;
    },
    []
  );

  const subtleChangedStyle = { boxShadow: 'inset 0 0 0 2px hsl(var(--accent-blue) / 0.24)' } as const;
  const [twentyOneExpanded, setTwentyOneExpanded] = useState(false);
  const [binokularExpanded, setBinokularExpanded] = useState(false);
  const twentyOneRef = useRef<HTMLDivElement | null>(null);
  const binokularContentRef = useRef<HTMLDivElement | null>(null);
  const [anchorOffset, setAnchorOffset] = useState(96);

  const focusFirstIn = useCallback((scope: HTMLElement | null) => {
    if (!scope) return;
    const focusable = scope.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable) return;
    requestAnimationFrame(() => focusable.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!twentyOneExpanded) return;
    focusFirstIn(twentyOneRef.current);
  }, [twentyOneExpanded, focusFirstIn]);

  useEffect(() => {
    if (!binokularExpanded) return;
    focusFirstIn(binokularContentRef.current);
  }, [binokularExpanded, focusFirstIn]);

  const updateAnchorOffset = useCallback(() => {
    const root = rootRef.current;
    const first = sectionRefs.current.autorefraktor;
    if (!root || !first) return;
    const rootRect = root.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const offset = Math.max(56, firstRect.top - rootRect.top - 8);
    setAnchorOffset(offset);
  }, []);

  useLayoutEffect(() => {
    const handle = () => updateAnchorOffset();
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [updateAnchorOffset]);

  useEffect(() => {
    const id = requestAnimationFrame(updateAnchorOffset);
    return () => cancelAnimationFrame(id);
  }, [updateAnchorOffset]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        const id = visible[0].target.getAttribute('data-section-id') as SectionId | null;
        if (id) {
          setActiveSection((prev) => (prev === id ? prev : id));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0.2 }
    );

    const nodes = Object.values(sectionRefs.current).filter(
      (node): node is HTMLElement => Boolean(node)
    );
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  const activeSectionLabel = useMemo(
    () => SECTION_META.find((section) => section.id === activeSection)?.label ?? SECTION_META[0].label,
    [activeSection]
  );

  return (
    <div className="relative space-y-6" ref={rootRef}>
      <div className="pointer-events-auto absolute -top-9 right-2 z-30">
        <button
          type="button"
          className="tahoe-ghost h-8 px-3"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
          onTouchStartCapture={(e) => e.stopPropagation()}
          onClick={() => onChange(makeDemoSynsprove())}
          aria-label="Indlæs demo"
          title="Indlæs demo"
        >
          Indlæs demo
        </button>
      </div>

      <div className="sticky z-20 pointer-events-none" style={{ top: `${anchorOffset}px` }}>
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-full border border-border/80 bg-surface/90 px-3 py-2 text-xs text-foreground/70 shadow-sm backdrop-blur">
          <div className="font-medium text-foreground/85">{activeSectionLabel}</div>
          <nav className="hidden md:flex items-center gap-1.5">
            {SECTION_META.map(({ id, label }) => {
              const isActive = id === activeSection;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className={cn(
                    'rounded-full px-2 py-1 transition-colors',
                    isActive
                      ? 'bg-foreground/10 text-foreground font-medium'
                      : 'text-foreground/60 hover:bg-foreground/5'
                  )}
                >
                  {label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <SectionCard
        id="autorefraktor"
        ref={setSectionRef('autorefraktor')}
        icon={<Camera size={16} />}
        title="Objektiv refraktion"
        contentClassName="space-y-4"
        hue={hue}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <EyeRxTable
            title="Seneste Rx"
            icon={<ClockCounterClockwise size={16} />}
            value={value.previousRx}
            onChange={(e, f, v) => setRx('previousRx', e, f, v)}
          />
          <EyeRxTable
            title="Autorefraktor"
            icon={<Camera size={16} />}
            value={value.autorefractor}
            onChange={(e, f, v) => setRx('autorefractor', e, f, v)}
          />
        </div>
      </SectionCard>

      <SectionCard
        id="retinoskopi"
        ref={setSectionRef('retinoskopi')}
        icon={<Flashlight size={16} />}
        title="Retinoskopi"
        contentClassName="space-y-4"
        hue={hue}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <EyeRxTable
            title="Retinoskopi — afstand"
            icon={<Flashlight size={16} />}
            value={value.retinoscopyDist}
            onChange={(e, f, v) => setRx('retinoscopyDist', e, f, v)}
            cols={['sph', 'cyl', 'axis', 'va']}
          />
          <EyeRxTable
            title="Retinoskopi — nær"
            icon={<Flashlight size={16} />}
            value={value.retinoscopyNear}
            onChange={(e, f, v) => setRx('retinoscopyNear', e, f, v)}
            cols={['sph', 'cyl', 'axis', 'va']}
          />
        </div>
      </SectionCard>

      <SectionCard
        id="subjektiv"
        ref={setSectionRef('subjektiv')}
        icon={<SealCheck size={16} />}
        title="Subjektiv bedste visus"
        hue={hue}
      >
        <EyeRxTable
          title="7A — Subjektiv bedste visus"
          icon={<SealCheck size={16} />}
          value={value.subjBest}
          onChange={(e, f, v) => setRx('subjBest', e, f, v)}
          cols={['sph', 'cyl', 'axis', 'prism', 'base', 'add', 'va']}
        />
      </SectionCard>

      <div id="binokulaer" ref={setSectionRef('binokulaer')} data-section-id="binokulaer">
        <Section
          icon={<ArrowsLeftRight size={16} />}
          title="Binokulær balance & akkommodation"
          wrapInCard
          cardHue={hue}
          className="space-y-0"
          defaultCollapsed
          onToggle={(expanded) => setBinokularExpanded(expanded)}
        >
          <div className="space-y-4" ref={binokularContentRef}>
            <FieldGroup title="Fori & konvergens" layoutClassName="md:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">8 — Fori v/ m/7 (afstand)</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.foriDistance ?? ''}
                  style={isChanged((v) => v.foriDistance) ? subtleChangedStyle : undefined}
                  onChange={(e) => set('foriDistance')({ foriDistance: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">8 — Fori v/ m/7 (nær)</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.foriNear ?? ''}
                  style={isChanged((v) => v.foriNear) ? subtleChangedStyle : undefined}
                  onChange={(e) => set('foriNear')({ foriNear: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">12 — Vertikal fori (afstand)</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.verticalForiFar ?? ''}
                  style={isChanged((v) => v.verticalForiFar) ? subtleChangedStyle : undefined}
                  onChange={(e) => set('verticalForiFar')({ verticalForiFar: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">12 — Vertikal fori (nær)</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.verticalForiNear ?? ''}
                  style={isChanged((v) => v.verticalForiNear) ? subtleChangedStyle : undefined}
                  onChange={(e) => set('verticalForiNear')({ verticalForiNear: e.target.value })}
                />
              </label>
            </FieldGroup>

        <FieldGroup
          title="Krydscylinder & lag"
          layoutClassName="md:grid-cols-2 md:gap-6 items-start"
        >
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/60">14B — Krydscylinder nær (OD)</span>
              <input
                className="tahoe-input h-8 w-full"
                value={value.crossCylNear_OD ?? ''}
                    style={isChanged((v) => v.crossCylNear_OD) ? subtleChangedStyle : undefined}
                    onChange={(e) => onChange({ ...value, crossCylNear_OD: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/60">Lag (OD)</span>
              <input
                className="tahoe-input h-8 w-full"
                value={value.crossCylLag_OD ?? ''}
                style={isChanged((v) => v.crossCylLag_OD) ? subtleChangedStyle : undefined}
                onChange={(e) => onChange({ ...value, crossCylLag_OD: e.target.value })}
              />
            </label>
          </div>
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-foreground/60">14B — Krydscylinder nær (OS)</span>
                  <input
                    className="tahoe-input h-8 w-full"
                    value={value.crossCylNear_OS ?? ''}
                    style={isChanged((v) => v.crossCylNear_OS) ? subtleChangedStyle : undefined}
                    onChange={(e) => onChange({ ...value, crossCylNear_OS: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-foreground/60">Lag (OS)</span>
                  <input
                    className="tahoe-input h-8 w-full"
                    value={value.crossCylLag_OS ?? ''}
                    style={isChanged((v) => v.crossCylLag_OS) ? subtleChangedStyle : undefined}
                    onChange={(e) => onChange({ ...value, crossCylLag_OS: e.target.value })}
                  />
                </label>
              </div>
            </FieldGroup>

            <FieldGroup title="Akkommodation" layoutClassName="md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">PRA</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.accommodation?.pra ?? ''}
                  style={isChanged((v) => v.accommodation?.pra) ? subtleChangedStyle : undefined}
                  onChange={(e) =>
                    set('accommodation')({ accommodation: { ...value.accommodation, pra: e.target.value } })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">NRA</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.accommodation?.nra ?? ''}
                  style={isChanged((v) => v.accommodation?.nra) ? subtleChangedStyle : undefined}
                  onChange={(e) =>
                    set('accommodation')({ accommodation: { ...value.accommodation, nra: e.target.value } })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">Amplitude</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.accommodation?.amp ?? ''}
                  style={isChanged((v) => v.accommodation?.amp) ? subtleChangedStyle : undefined}
                  onChange={(e) =>
                    set('accommodation')({ accommodation: { ...value.accommodation, amp: e.target.value } })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">Positiv relat. akk.</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.positiveRelAcc ?? ''}
                  style={isChanged((v) => v.positiveRelAcc) ? subtleChangedStyle : undefined}
                  onChange={(e) => onChange({ ...value, positiveRelAcc: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">Negativ relat. akk.</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.negativeRelAcc ?? ''}
                  style={isChanged((v) => v.negativeRelAcc) ? subtleChangedStyle : undefined}
                  onChange={(e) => onChange({ ...value, negativeRelAcc: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-foreground/60">Fiksationsdisparitet</span>
                <input
                  className="tahoe-input h-8 w-full"
                  value={value.fixationDisparity ?? ''}
                  style={isChanged((v) => v.fixationDisparity) ? subtleChangedStyle : undefined}
                  onChange={(e) => onChange({ ...value, fixationDisparity: e.target.value })}
                />
              </label>
            </FieldGroup>
          </div>
        </Section>
      </div>

      <div id="twentyone" ref={setSectionRef('twentyone')} data-section-id="twentyone">
        <Section
          icon={<SquaresFour size={16} />}
          title="Udvidet samsyn og akkommodation (21-punkts synsprøve)"
          tooltip="Valgfri udvidet test. Udfyld enkelte felter eller hele testen. Data registreres automatisk."
          onToggle={setTwentyOneExpanded}
          wrapInCard
          cardHue={hue}
          className="space-y-0"
        >
          <div ref={twentyOneRef}>
            <TwentyOneView
              value={twentyOne}
              onChange={onTwentyOneChange}
              hue={hue}
              variant="embedded"
            />
          </div>
        </Section>
      </div>

      <SectionCard
        id="konklusion"
        ref={setSectionRef('konklusion')}
        icon={<ClipboardText size={16} />}
        title="Konklusion & noter"
        contentClassName="space-y-5"
        hue={hue}
      >
        <FieldGroup title="Pupildistance" layoutClassName="md:grid-cols-2 md:gap-6 items-start">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1.5 text-xs text-foreground/60">
              <Ruler size={14} /> PD (afstand)
            </span>
            <input
              className="tahoe-input h-8 w-full"
              value={value.pdDistance ?? ''}
              style={isChanged((v) => v.pdDistance) ? subtleChangedStyle : undefined}
              onChange={(e) => set('pdDistance')({ pdDistance: e.target.value })}
              onBlur={(e) => set('pdDistance')({ pdDistance: fmtPd(e.currentTarget.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1.5 text-xs text-foreground/60">
              <Ruler size={14} /> PD (nær)
            </span>
            <input
              className="tahoe-input h-8 w-full"
              value={value.pdNear ?? ''}
              style={isChanged((v) => v.pdNear) ? subtleChangedStyle : undefined}
              onChange={(e) => set('pdNear')({ pdNear: e.target.value })}
              onBlur={(e) => set('pdNear')({ pdNear: fmtPd(e.currentTarget.value) })}
            />
          </label>
        </FieldGroup>

        <div className="grid gap-4 md:grid-cols-2">
          <EyeRxTable
            title="Konklusion — afstand"
            icon={<ClipboardText size={16} />}
            value={value.conclusionDistance}
            onChange={(e, f, v) => setRx('conclusionDistance', e, f, v)}
            cols={DEFAULT_COLS}
            actions={
              <button
                className="tahoe-ghost h-7 px-3 text-[12px] font-medium"
                onClick={() => copySubjBestTo('conclusionDistance')}
              >
                Overfør fra ”Subjektiv bedste visus”
              </button>
            }
          />
          <EyeRxTable
            title="Konklusion — nær"
            icon={<ClipboardText size={16} />}
            value={value.conclusionNear}
            onChange={(e, f, v) => setRx('conclusionNear', e, f, v)}
            cols={DEFAULT_COLS}
            actions={
              <button
                className="tahoe-ghost h-7 px-3 text-[12px] font-medium"
                onClick={() => copySubjBestTo('conclusionNear')}
              >
                Overfør fra ”Subjektiv bedste visus”
              </button>
            }
          />
          <EyeRxTable
            title="Konklusion — arbejdsbriller"
            icon={<ClipboardText size={16} />}
            value={value.conclusionTask}
            onChange={(e, f, v) => setRx('conclusionTask', e, f, v)}
            cols={DEFAULT_COLS}
            actions={
              <button
                className="tahoe-ghost h-7 px-3 text-[12px] font-medium"
                onClick={() => copySubjBestTo('conclusionTask')}
              >
                Overfør fra ”Subjektiv bedste visus”
              </button>
            }
          />
          <EyeRxTable
            title="Konklusion — sportsbriller"
            icon={<ClipboardText size={16} />}
            value={value.conclusionSports}
            onChange={(e, f, v) => setRx('conclusionSports', e, f, v)}
            cols={DEFAULT_COLS}
            actions={
              <button
                className="tahoe-ghost h-7 px-3 text-[12px] font-medium"
                onClick={() => copySubjBestTo('conclusionSports')}
              >
                Overfør fra ”Subjektiv bedste visus”
              </button>
            }
          />
        </div>

        <FieldGroup title="Noter" layoutClassName="grid-cols-1">
          <div>
            <textarea
              className="tahoe-input h-[120px] w-full"
              value={value.notes ?? ''}
              style={isChanged((v) => v.notes ?? '') ? subtleChangedStyle : undefined}
              onChange={(e) => set('notes')({ notes: e.target.value })}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onMouseDownCapture={(e) => e.stopPropagation()}
              onTouchStartCapture={(e) => e.stopPropagation()}
            />
          </div>
        </FieldGroup>
      </SectionCard>
    </div>
  );
}
