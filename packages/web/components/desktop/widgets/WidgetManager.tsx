'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { useWidgets, type WidgetId } from '@/store/widgets';
import { WIDGET_CATALOG } from './catalog';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

/* ---------------------------------------------
   Hotkey: ⌘⇧W to toggle
---------------------------------------------- */
function useHotkey(toggle: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
}

/* ---------------------------------------------
   Measure child height and animate parent height
---------------------------------------------- */
function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  return { ref, height };
}

function HeightAuto({
  children,
  outerClassName,
  innerClassName,
}: {
  children: React.ReactNode;
  outerClassName?: string;
  innerClassName?: string;
}) {
  const { ref, height } = useMeasuredHeight<HTMLDivElement>();
  return (
    <motion.div
      layout={false}
      animate={{ height }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className={outerClassName}
      style={{ overflow: 'hidden' }}
    >
      <div ref={ref} className={innerClassName}>
        {children}
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------
   Manager
---------------------------------------------- */
export default function WidgetManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { widgets, toggle } = useWidgets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WidgetId>('todaySchedule');

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WIDGET_CATALOG.filter((w) =>
      q ? w.title.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) : true,
    );
  }, [query]);

  const sel = WIDGET_CATALOG.find((w) => w.id === selected) ?? WIDGET_CATALOG[0];
  const wState = widgets[sel.id];

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      {/* Backdrop: soft blur + tint (like your alert dialogs) */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(28px) saturate(155%)',
          WebkitBackdropFilter: 'blur(28px) saturate(155%)',
          background: 'linear-gradient(to bottom, rgba(255,255,255,.66), rgba(255,255,255,.48))',
        }}
      />
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-80 pointer-events-none"
        style={{
          background:
            'radial-gradient(900px 520px at 50% -10%, rgba(56,189,248,.22), transparent 60%), radial-gradient(800px 480px at 60% -8%, rgba(14,165,233,.20), transparent 55%)',
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed left-1/2 top-1/2 z-[131] grid w-[min(980px,92vw)] -translate-x-1/2 -translate-y-1/2',
          'rounded-2xl border border-hair bg-white/85 backdrop-blur-md shadow-[0_24px_120px_rgba(0,0,0,.18)]',
          'origin-center data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
        )}
        data-state="open"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-hair">
          <div>
            <div className="text-[13px] font-semibold">Widgets</div>
            <div className="text-xs text-foreground/60">Styr synlighed og layout</div>
          </div>

          {/* Bulk actions */}
          <div className="segment">
            <button
              onClick={() =>
                (Object.keys(widgets) as WidgetId[]).forEach((id) =>
                  useWidgets.getState().toggle(id, true),
                )
              }
            >
              Vis alle
            </button>
            <button
              onClick={() =>
                (Object.keys(widgets) as WidgetId[]).forEach((id) =>
                  useWidgets.getState().toggle(id, false),
                )
              }
            >
              Skjul alle
            </button>
            <button onClick={onClose}>Luk</button>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-[260px_1fr] max-h-[70vh]">
          {/* Left rail */}
          <aside className="border-r border-hair bg-paper-2 p-3">
            <div className="tahoe-input w-full mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.5L21.5 20zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14"
                />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søg widgets…"
                className="flex-1 bg-transparent outline-none"
              />
              <kbd className="text-xs text-foreground/60">⌘⇧W</kbd>
            </div>

            <div className="space-y-1 overflow-auto max-h-[56vh] pr-1">
              {list.map((w) => {
                const active = w.id === sel.id;
                const visible = widgets[w.id]?.visible;

                return (
                  <motion.button
                    key={w.id}
                    layout
                    onClick={() => setSelected(w.id)}
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.988 }}
                    className={cn(
                      'group relative w-full select-none text-left',
                      'rounded-xl px-2.5 py-2',
                      'transition-[background,box-shadow] duration-200 ease-out',
                    )}
                  >
                    {/* Active pill that morphs between items */}
                    {active && (
                      <motion.span
                        layoutId="wm-active-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,.85)',
                          boxShadow:
                            'inset 0 0 0 1px rgba(59,130,246,.25), 0 4px 14px rgba(14,165,233,.14)',
                          backdropFilter: 'blur(8px)',
                        }}
                      />
                    )}

                    {/* Hover surface */}
                    <span
                      className={cn(
                        'absolute inset-0 rounded-xl',
                        'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                        'ring-1 ring-white/60 bg-white/70',
                      )}
                      aria-hidden
                    />

                    {/* Content */}
                    <span className="relative z-[1] flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full transition-colors"
                        style={{
                          background: visible ? 'hsl(var(--accent-blue))' : 'hsl(var(--line))',
                        }}
                      />
                      <span
                        className={cn(
                          'truncate text-[13px] font-medium transition-colors',
                          active ? 'text-[hsl(var(--accent-blue))]' : 'text-foreground',
                        )}
                      >
                        {w.title}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
              {list.length === 0 && (
                <div className="px-2 py-8 text-center text-xs text-foreground/60">
                  Ingen widgets matcher “{query}”.
                </div>
              )}
            </div>
          </aside>

          {/* Right pane */}
          <section className="p-5 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={sel.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-3">
                  <div className="text-[15px] font-semibold">{sel.title}</div>
                  <div className="text-xs text-foreground/60">{sel.description}</div>
                </div>

                {/* Smooth height (no flicker) */}
                <HeightAuto
                  outerClassName="mb-4 rounded-2xl border border-hair bg-white/70 backdrop-blur-sm shadow-sm"
                  innerClassName="p-4"
                >
                  <sel.Preview />
                </HeightAuto>

                {/* Controls: only visibility for now */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-[13px]">
                    <Switch
                      checked={!!wState?.visible}
                      onCheckedChange={() => toggle(sel.id)}
                      aria-label="Synlig på skrivebordet"
                    />
                    <span className="text-foreground/75">På skrivebordet</span>
                  </label>

                  {/* Coordinates (tiny helper) */}
                  {wState && (
                    <span className="text-[11px] text-foreground/60 ml-auto">
                      {wState.w}×{wState.h}px · {wState.x},{wState.y}
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-hair bg-paper-2 rounded-b-2xl">
          <button className="tahoe-ghost" onClick={onClose}>
            Luk
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Optional launcher button if you need it elsewhere */
export function WidgetManagerButton() {
  const [open, setOpen] = useState(false);
  useHotkey(() => setOpen((v) => !v));
  return (
    <>
      <button className="tahoe-ghost" onClick={() => setOpen(true)} title="Widgets (⌘⇧W)">
        Widgets
      </button>
      <WidgetManager open={open} onClose={() => setOpen(false)} />
    </>
  );
}
