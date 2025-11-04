'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import type { Anamnese, DialogQuestionId, DialogResponse, OldRxFormValue } from './SynsJournal';
import MultiSelect from '@/components/ui/MultiSelect';

// domain
import {
  REASONS,
  SYMPTOMS,
  MEDICAL_HISTORY,
  MEDICATIONS,
  FAMILY_HISTORY,
  WORK_SITUATIONS,
  RX_COLUMNS,
  RX_COPY_SOURCES,
} from '@/lib/optometry/constants';
import type { Eye } from './types';
import type { RxField, RxRow, RxTable } from '@/lib/optometry/types';
import { t } from '@/lib/optometry/i18n';

// icons
import {
  CheckCircle,
  XCircle,
  Question,
  ChatTeardropText,
  ChatCircleDots,
  Heartbeat,
  Pill,
  UsersThree,
  Briefcase,
  Binoculars,
  Eyeglasses,
  WaveSine,
  ArrowsLeftRight,
  BookOpenText,
  SunHorizon,
  Ghost,
  Brain,
  SmileyXEyes,
  FirstAid,
  Stethoscope,
  CaretDown,
  CaretRight,
} from '@phosphor-icons/react';

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
  return <input {...props} className={cn('tahoe-input w-full h-8', props.className)} />;
}

/* ============================== OLD RX PANEL ============================== */

const EMPTY_ROW: RxRow = { sph: '', cyl: '', axe: '', prism: '', base: '', add: '', va: '' };
const EMPTY_RX: RxTable = { OD: { ...EMPTY_ROW }, OS: { ...EMPTY_ROW } };

function OldRxPanel({
  hue,
  value,
  onChange,
}: {
  hue: number;
  value: OldRxFormValue;
  onChange: (patch: Partial<OldRxFormValue>) => void;
}) {
  const [source, setSource] = useState(value.oldRx_source || RX_COPY_SOURCES[0]);
  const [rx, setRx] = useState<RxTable>(() => {
    const rd = (eye: Eye, f: RxField) => value?.[`oldRx_${eye}_${f}`] || '';
    return {
      OD: RX_COLUMNS.reduce((row, f) => ((row[f] = rd('OD', f)), row), { ...EMPTY_ROW } as RxRow),
      OS: RX_COLUMNS.reduce((row, f) => ((row[f] = rd('OS', f)), row), { ...EMPTY_ROW } as RxRow),
    };
  });
  const [vaURx, setVaURx] = useState(value.oldRx_vaURx || '');
  const [pdFar, setPdFar] = useState(value.oldRx_pdFar || '');
  const [pdNear, setPdNear] = useState(value.oldRx_pdNear || '');
  const [bin, setBin] = useState(value.oldRx_bin === '1');

  // Advanced collapse
  const [advOpen, setAdvOpen] = useState(false);
  const [habFar, setHabFar] = useState<Record<Eye, string>>({
    OD: value.oldRx_OD_habFar || '',
    OS: value.oldRx_OS_habFar || '',
  });
  const [habNear, setHabNear] = useState<Record<Eye, string>>({
    OD: value.oldRx_OD_habNear || '',
    OS: value.oldRx_OS_habNear || '',
  });
  const [vaBinFar, setVaBinFar] = useState(value.oldRx_vaBinFar || '');
  const [vaBinNear, setVaBinNear] = useState(value.oldRx_vaBinNear || '');

  // Bubble up
  useEffect(() => {
    const pack: Partial<OldRxFormValue> = {
      oldRx_source: source,
      oldRx_vaURx: vaURx,
      oldRx_pdFar: pdFar,
      oldRx_pdNear: pdNear,
      oldRx_bin: bin ? '1' : '0',
      oldRx_OD_habFar: habFar.OD,
      oldRx_OS_habFar: habFar.OS,
      oldRx_OD_habNear: habNear.OD,
      oldRx_OS_habNear: habNear.OS,
      oldRx_vaBinFar: vaBinFar,
      oldRx_vaBinNear: vaBinNear,
    };
    (['OD', 'OS'] as Eye[]).forEach((eye) =>
      RX_COLUMNS.forEach((f) => (pack[`oldRx_${eye}_${f}`] = rx[eye][f]))
    );
    onChange(pack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, rx, vaURx, pdFar, pdNear, bin, habFar, habNear, vaBinFar, vaBinNear]);

  // Copy-from (demo)
  const copyFrom = () => {
    const demo: RxTable = {
      OD: { sph: '-0.50', cyl: '-1.25', axe: '10', prism: '', base: '', add: '+1.75', va: '1.0' },
      OS: { sph: '-2.25', cyl: '-1.25', axe: '170', prism: '', base: '', add: '+1.75', va: '0.9' },
    };
    setRx(demo);
    setVaURx('1.0 / 0.9');
    setPdFar('64.0');
    setPdNear('60.5');
  };

  // Grid keyboard nav (remains local to the inputs)
  const gridRef = useRef<HTMLDivElement | null>(null);
  const focusCell = (eye: Eye, f: RxField) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-eye="${eye}"][data-f="${f}"]`
    );
    el?.focus();
    el?.select();
  };
  const move = (eye: Eye, f: RxField, dir: 'left' | 'right' | 'up' | 'down') => {
    const ei = eye === 'OD' ? 0 : 1;
    const fi = RX_COLUMNS.indexOf(f);
    let ne = ei,
      nf = fi;
    if (dir === 'left') nf = Math.max(0, fi - 1);
    if (dir === 'right') nf = Math.min(RX_COLUMNS.length - 1, fi + 1);
    if (dir === 'up') ne = Math.max(0, ei - 1);
    if (dir === 'down') ne = Math.min(1, ei + 1);
    focusCell(ne === 0 ? 'OD' : 'OS', RX_COLUMNS[nf]);
  };
  const onCellKey = (eye: Eye, f: RxField, e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (k === 'Escape') (e.target as HTMLInputElement).blur();
    if (k === 'ArrowLeft') {
      e.preventDefault();
      move(eye, f, 'left');
    }
    if (k === 'ArrowRight') {
      e.preventDefault();
      move(eye, f, 'right');
    }
    if (k === 'ArrowUp') {
      e.preventDefault();
      move(eye, f, 'up');
    }
    if (k === 'ArrowDown') {
      e.preventDefault();
      move(eye, f, 'down');
    }
  };

  const set = (eye: Eye, f: RxField, v: string) =>
    setRx((prev) => ({ ...prev, [eye]: { ...prev[eye], [f]: v } }));

  // Summary helpers
  const hasAny = RX_COLUMNS.some((f) => rx.OD[f] || rx.OS[f]) || vaURx || pdFar || pdNear;
  const summaryText = useMemo(() => {
    const fmt = (r: RxRow) =>
      `${r.sph || '—'}/${r.cyl || '—'} × ${r.axe || '—'}${
        r.add ? ` (+${r.add.replace('+', '')})` : ''
      }${r.va ? ` • VA ${r.va}` : ''}`;
    const od = fmt(rx.OD),
      os = fmt(rx.OS);
    const pd = pdFar || pdNear ? ` • PD ${pdFar || '—'} / ${pdNear || '—'}` : '';
    const ur = vaURx ? ` • VA u. Rx ${vaURx}` : '';
    return `OD ${od}  |  OS ${os}${pd}${ur}`;
  }, [rx, pdFar, pdNear, vaURx]);

  return (
    <Card hue={hue} className="space-y-3">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[13px] font-medium text-foreground/80">{t.oldRx}</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm inline-flex items-center gap-2">
            <span className="text-xs text-foreground/65">{t.copyFrom}</span>
            <select
              className="tahoe-input h-8"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {RX_COPY_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="tahoe-input h-8 px-3 hover:bg-surface-2" onClick={copyFrom}>
            {t.copy}
          </button>
        </div>
      </div>

      {/* grid — items-start prevents stretch; footer reuses spare space nicely */}
      <div ref={gridRef} className="grid gap-3 lg:grid-cols-3 items-start">
        {/* Table */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-paper overflow-hidden">
          {/* head */}
          <div className="grid grid-cols-8 gap-px bg-border/60 p-px text-[11px] text-foreground/65">
            <div className="bg-paper py-1 px-2">Øje</div>
            {RX_COLUMNS.map((h) => (
              <div key={h} className="bg-paper py-1 px-2 text-center">
                {h.toUpperCase()}
              </div>
            ))}
          </div>

          {/* rows */}
          {(['OD', 'OS'] as Eye[]).map((eye) => (
            <div key={eye} className="grid grid-cols-8 gap-px bg-border/60 p-px">
              <div className="bg-paper px-2 py-1 text-sm text-foreground/75">{eye}</div>
              {RX_COLUMNS.map((f) => (
                <div key={`${eye}-${f}`} className="bg-paper p-1">
                  <input
                    data-eye={eye}
                    data-f={f}
                    className="tahoe-input w-full h-8 text-sm"
                    value={rx[eye][f]}
                    onChange={(e) => set(eye, f, e.target.value)}
                    onKeyDown={(e) => onCellKey(eye, f, e)}
                    inputMode={f === 'axe' || f === 'sph' || f === 'cyl' ? 'decimal' : 'text'}
                    placeholder=""
                  />
                </div>
              ))}
            </div>
          ))}

          {/* footer summary (conditional) */}
          {hasAny && (
            <div className="border-t border-border/70 bg-surface/60 px-2 py-1.5 text-[12px] text-foreground/80 flex items-center gap-2 justify-between">
              <div className="truncate">{summaryText}</div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  type="button"
                  className="tahoe-input h-7 px-2 text-[12px]"
                  onClick={() => navigator.clipboard?.writeText(summaryText)}
                >
                  Kopiér
                </button>
                <button
                  type="button"
                  className="tahoe-input h-7 px-2 text-[12px]"
                  onClick={() => {
                    setRx({ ...EMPTY_RX });
                    setVaURx('');
                    setPdFar('');
                    setPdNear('');
                  }}
                >
                  Ryd
                </button>
                <button
                  type="button"
                  className="tahoe-input h-7 px-2 text-[12px]"
                  onClick={() => setRx((p) => ({ OD: p.OS, OS: p.OD }))}
                >
                  Byt OD/OS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Extras */}
        <div className="space-y-2">
          <label className="text-sm">
            <div className="mb-1 text-xs text-foreground/65">{t.vaURx}</div>
            <Input value={vaURx} onChange={(e) => setVaURx(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <div className="mb-1 text-xs text-foreground/65">{t.pdFar}</div>
              <Input value={pdFar} onChange={(e) => setPdFar(e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-xs text-foreground/65">{t.pdNear}</div>
              <Input value={pdNear} onChange={(e) => setPdNear(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={bin} onChange={(e) => setBin(e.target.checked)} />
            <span className="text-foreground/80">{t.bin}</span>
          </label>

          {/* Advanced collapse */}
          <div className="mt-3 rounded-lg border border-border/80 bg-surface/60">
            <button
              type="button"
              onClick={() => setAdvOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-foreground/80">{t.advanced}</span>
              {advOpen ? <CaretDown size={16} /> : <CaretRight size={16} />}
            </button>
            {advOpen && (
              <div className="border-t border-border/70 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-xs text-foreground/65">Hab VA (afstand)</div>
                  <Input
                    value={habFar.OD}
                    onChange={(e) => setHabFar((p) => ({ ...p, OD: e.target.value }))}
                  />
                  <Input
                    value={habFar.OS}
                    onChange={(e) => setHabFar((p) => ({ ...p, OS: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-xs text-foreground/65">Hab VA (nær)</div>
                  <Input
                    value={habNear.OD}
                    onChange={(e) => setHabNear((p) => ({ ...p, OD: e.target.value }))}
                  />
                  <Input
                    value={habNear.OS}
                    onChange={(e) => setHabNear((p) => ({ ...p, OS: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label>
                    <div className="mb-1 text-xs text-foreground/65">VA bin (afstand)</div>
                    <Input value={vaBinFar} onChange={(e) => setVaBinFar(e.target.value)} />
                  </label>
                  <label>
                    <div className="mb-1 text-xs text-foreground/65">VA bin (nær)</div>
                    <Input value={vaBinNear} onChange={(e) => setVaBinNear(e.target.value)} />
                  </label>
                </div>
                <div>
                  <div className="mb-1 text-xs text-foreground/65">{t.notesOld}</div>
                  <Textarea
                    rows={3}
                    className="bg-paper"
                    placeholder="Noter fra kundens tidligere briller/Rx…"
                    defaultValue={value.oldRx_notes || ''}
                    onChange={(e) => onChange({ ...value, oldRx_notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================ TRI TOGGLE & DIALOG ============================ */

function TriToggle({
  value,
  onChange,
}: {
  value?: DialogResponse;
  onChange: (v: DialogResponse) => void;
}) {
  const Btn = ({
    k,
    label,
    active,
    tone,
    icon,
  }: {
    k: 'ja' | 'nej' | 'ved_ikke';
    label: string;
    active: boolean;
    tone: 'green' | 'red' | 'zinc';
    icon: React.ReactNode;
  }) => {
    const base =
      'inline-flex items-center gap-1.5 h-9 rounded-md border px-2.5 text-[13px] transition-colors';
    const palette = {
      green: active
        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900'
        : 'bg-surface border-border text-emerald-700 hover:bg-emerald-500/10',
      red: active
        ? 'bg-rose-500/20 border-rose-500 text-rose-900'
        : 'bg-surface border-border text-rose-700 hover:bg-rose-500/10',
      zinc: active
        ? 'bg-zinc-200/70 border-zinc-400 text-zinc-900'
        : 'bg-surface border-border text-foreground/75 hover:bg-surface-2',
    }[tone];

    // 🔐 Ensure clicks/taps never bubble up and interfere with window/row handlers
    const stopAllCapture = (e: React.SyntheticEvent) => {
      e.stopPropagation();
    };

    return (
      <button
        type="button"
        className={cn(base, palette, 'select-none')}
        style={{ touchAction: 'manipulation' }}
        onPointerDownCapture={stopAllCapture}
        onMouseDownCapture={stopAllCapture}
        onTouchStartCapture={stopAllCapture}
        onClick={() => onChange(k)}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <Btn
        k="ja"
        label="Ja"
        active={value === 'ja'}
        tone="green"
        icon={<CheckCircle size={16} />}
      />
      <Btn k="nej" label="Nej" active={value === 'nej'} tone="red" icon={<XCircle size={16} />} />
      <Btn
        k="ved_ikke"
        label="?"
        active={value === 'ved_ikke'}
        tone="zinc"
        icon={<Question size={16} />}
      />
    </div>
  );
}

function DialogRow({
  index: _index,
  label,
  icon,
  value,
  note,
  onChange,
  onChangeNote,
  focused,
  onFocus,
  autoAdvance,
}: {
  index: number;
  label: string;
  icon: React.ReactNode;
  value?: DialogResponse;
  note?: string;
  onChange: (v: DialogResponse) => void;
  onChangeNote: (v: string) => void;
  focused?: boolean;
  onFocus?: () => void;
  autoAdvance?: () => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLInputElement | null>(null);

  // Helper: only handle keys if ancestor window is active
  const isActiveWindow = () => {
    const host = rowRef.current?.closest('[data-win-id]') as HTMLElement | null;
    return !!host && host.getAttribute('data-active') === '1';
  };

  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focused]);

  // J/N/K + Shift+N (note) hotkeys — gated by active window and not typing in inputs
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isActiveWindow()) return;

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase?.();
      if (tag && ['input', 'textarea', 'select'].includes(tag)) return;

      const key = e.key?.toLowerCase?.();
      if (!key) return;

      // Shift+N -> focus note
      if (key === 'n' && e.shiftKey) {
        e.preventDefault();
        noteRef.current?.focus();
        return;
      }

      if (key === 'j') {
        e.preventDefault();
        onChange('ja');
        autoAdvance?.();
        return;
      }
      if (key === 'n') {
        e.preventDefault();
        onChange('nej');
        autoAdvance?.();
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        onChange('ved_ikke');
        autoAdvance?.();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, onChange, autoAdvance]);

  const showNote = value === 'ja' || (!!note && note.trim().length > 0);

  return (
    <div
      ref={rowRef}
      onClick={onFocus}
      className={cn(
        'relative overflow-hidden rounded-lg border p-2 transition-all grid grid-cols-12 items-center gap-2',
        focused
          ? 'ring-2 ring-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue)/.06)] shadow-[0_8px_22px_rgba(0,0,0,.10)] border-transparent'
          : 'border-border'
      )}
    >
      <span
        className="absolute left-[-1px] top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: 'hsl(var(--accent-blue))', opacity: focused ? 1 : 0 }}
        aria-hidden
      />
      <div
        className={cn(
          'col-span-5 flex items-center gap-2 text-sm',
          focused ? 'text-foreground font-medium' : 'text-foreground/90'
        )}
      >
        <span className="text-foreground/65">{icon}</span>
        {label}
      </div>
      <div className="col-span-4">
        <TriToggle
          value={value}
          onChange={(v) => {
            onChange(v);
            autoAdvance?.();
          }}
        />
      </div>
      <div className="col-span-3">
        {showNote && (
          <input
            ref={noteRef}
            className="tahoe-input w-full"
            placeholder="Tilføj note…"
            defaultValue={note}
            onChange={(e) => onChangeNote(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export default function AnamneseView({
  value,
  onChange,
  hue,
}: {
  value: Anamnese;
  onChange: (v: Anamnese) => void;
  hue: number;
}) {
  // Root ref to detect active window for this view's global nav keys
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isActiveWindow = () => {
    const host = rootRef.current?.closest('[data-win-id]') as HTMLElement | null;
    return !!host && host.getAttribute('data-active') === '1';
  };

  // collapsible pickers body (chips always visible)
  const [pickersOpen, setPickersOpen] = useState(false);

  // reasons state
  const [reasons, setReasons] = useState<string[]>(() =>
    value.reason
      ? value.reason
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );
  useEffect(() => {
    onChange({ ...value, reason: reasons.join('; ') });
  }, [reasons]); // eslint-disable-line

  // dialog state & hotkeys
  type DialogQuestion = { id: DialogQuestionId; label: string; icon: React.ReactNode };
  const QUESTIONS = useMemo<DialogQuestion[]>(
    () => [
      { id: 'blur_far', label: 'Slør på afstand', icon: <Binoculars size={16} /> },
      { id: 'blur_near', label: 'Slør på nær', icon: <Eyeglasses size={16} /> },
      { id: 'periodic_blur', label: 'Periodisk slør / flimmer', icon: <WaveSine size={16} /> },
      { id: 'accommodation', label: 'Omstillingsbesvær', icon: <ArrowsLeftRight size={16} /> },
      {
        id: 'reading',
        label: 'Læsning / problemer på læseafstand',
        icon: <BookOpenText size={16} />,
      },
      { id: 'light', label: 'Lysproblemer / blænding', icon: <SunHorizon size={16} /> },
      { id: 'double', label: 'Dobbelt / skelen / lukke ét øje', icon: <Ghost size={16} /> },
      { id: 'headache', label: 'Hovedpine / tunghed / ondt', icon: <Brain size={16} /> },
      { id: 'fatigue', label: 'Træthed / sand / svie / kløe', icon: <SmileyXEyes size={16} /> },
      { id: 'redness', label: 'Rødme / vand / svimmel', icon: <FirstAid size={16} /> },
      {
        id: 'medical_state',
        label: 'Sygdom / medicin / graviditet',
        icon: <Stethoscope size={16} />,
      },
      { id: 'family', label: 'Familiehistorik (øjenlidelse)', icon: <UsersThree size={16} /> },
    ],
    []
  );
  const [focusIdx, setFocusIdx] = useState(0);

  // Global ↑/↓ row navigation — only when this window is active and not typing in inputs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActiveWindow()) return;

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase?.();
      if (tag && ['input', 'textarea', 'select'].includes(tag)) return;

      const k = e.key.toLowerCase?.();
      if (k === 'arrowdown' || k === 'arrowup') e.preventDefault();
      if (k === 'arrowdown') setFocusIdx((i) => Math.min(i + 1, QUESTIONS.length - 1));
      if (k === 'arrowup') setFocusIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [QUESTIONS.length]);

  return (
    <div ref={rootRef} className="space-y-4">
      {/* Old Rx */}
      <OldRxPanel
        hue={hue}
        value={value}
        onChange={(patch) => onChange({ ...value, ...patch })}
      />

      {/* Collapsible “Årsag til besøg” body — chips always visible */}
      <Card hue={hue} className="space-y-3">
        <div className="rounded-lg border border-border/70 bg-surface/60 p-3">
          {/* header toggles only the BODY (not the chips) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChatTeardropText size={14} />
              <span className="text-foreground/85">{t.reasons}</span>
            </div>
            <button
              type="button"
              onClick={() => setPickersOpen((v) => !v)}
              className="tahoe-ghost h-7 px-2 flex items-center gap-1 text-[12px]"
              aria-expanded={pickersOpen}
              aria-controls="anamnese-pickers"
            >
              {pickersOpen ? 'Skjul' : 'Vis mere'}{' '}
              {pickersOpen ? <CaretDown size={14} /> : <CaretRight size={14} />}
            </button>
          </div>

          {/* chips — ALWAYS visible */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {REASONS.map((label) => {
              const active = reasons.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setReasons((prev) =>
                      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
                    )
                  }
                  className={cn(
                    'h-8 rounded-full border px-3 text-[12px]',
                    active ? 'text-white' : 'text-foreground/80'
                  )}
                  style={
                    active
                      ? {
                          background: 'hsl(var(--accent-blue))',
                          borderColor: 'hsl(var(--accent-blue))',
                        }
                      : { background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* BODY (pickers grid) — collapsible */}
          <div
            id="anamnese-pickers"
            className={cn(
              'grid transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)]',
              pickersOpen ? 'grid-cols-1  gap-3 mt-3' : 'grid-rows-[0fr] overflow-hidden mt-1'
            )}
          >
            <div className={cn(!pickersOpen && 'min-h-0 overflow-hidden')}>
              <div className="grid gap-3 lg:grid-cols-2">
                {/* symptoms */}
                <label className="text-sm">
                  <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
                    <ChatCircleDots size={14} /> <span>{t.symptoms}</span>
                  </div>
                  <MultiSelect
                    value={(value.symptoms || '')
                      .split(';')
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(arr) => onChange({ ...value, symptoms: arr.join('; ') })}
                    options={SYMPTOMS as unknown as string[]}
                    placeholder="Skriv eller vælg symptomer…"
                  />
                </label>

                {/* medical */}
                <label className="text-sm">
                  <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
                    <Heartbeat size={14} /> <span>{t.medical}</span>
                  </div>
                  <MultiSelect
                    value={(value.medical || '')
                      .split(';')
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(arr) => onChange({ ...value, medical: arr.join('; ') })}
                    options={MEDICAL_HISTORY as unknown as string[]}
                    placeholder="Tilføj tilstande…"
                  />
                </label>

                {/* meds */}
                <label className="text-sm">
                  <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
                    <Pill size={14} /> <span>{t.meds}</span>
                  </div>
                  <MultiSelect
                    value={(value.meds || '')
                      .split(';')
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(arr) => onChange({ ...value, meds: arr.join('; ') })}
                    options={MEDICATIONS as unknown as string[]}
                    placeholder="Tilføj medicin…"
                  />
                </label>

                {/* family */}
                <label className="text-sm">
                  <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
                    <UsersThree size={14} /> <span>{t.family}</span>
                  </div>
                  <MultiSelect
                    value={(value.familyHx || '')
                      .split(';')
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(arr) => onChange({ ...value, familyHx: arr.join('; ') })}
                    options={FAMILY_HISTORY as unknown as string[]}
                    placeholder="Tilføj fund/tilstande…"
                  />
                </label>

                {/* work */}
                <label className="text-sm">
                  <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
                    <Briefcase size={14} /> <span>{t.work}</span>
                  </div>
                  <MultiSelect
                    value={(value.work || '')
                      .split(';')
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(arr) => onChange({ ...value, work: arr.join('; ') })}
                    options={WORK_SITUATIONS as unknown as string[]}
                    placeholder="Tilføj arbejdssituation…"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* DIALOG (hotkeys intact but gated by active window) */}
      <Card hue={hue} className="space-y-2">
        <div className="sticky top-1 z-10 rounded-t-xl bg-surface/90 px-3 py-2 text-[11px] text-foreground/60 backdrop-blur flex justify-between">
          <div>Dialog</div>
          <div>
            Pile ↑/↓ · <span className="text-emerald-700 font-medium">J = Ja</span> ·{' '}
            <span className="text-rose-700 font-medium">N = Nej</span> · K = ? · Shift+N = note
          </div>
        </div>
        <div className="grid gap-2">
          {QUESTIONS.map((q, i) => (
            <DialogRow
              key={q.id}
              index={i}
              label={q.label}
              icon={q.icon}
              value={value[q.id] ?? ''}
              note={value[`${q.id}_note`] ?? ''}
              onChange={(v) => onChange({ ...value, [q.id]: v })}
              onChangeNote={(n) => onChange({ ...value, [`${q.id}_note`]: n })}
              focused={i === focusIdx}
              onFocus={() => setFocusIdx(i)}
              autoAdvance={() => {
                if (i >= QUESTIONS.length - 1) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setFocusIdx(0);
                } else setFocusIdx(i + 1);
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
