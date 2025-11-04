'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { useDesktop } from '@/store/desktop';
import { useShallow } from 'zustand/react/shallow';
import {
  Plus,
  User,
  Calendar as CalendarIcon,
  FileText,
  Package,
  MessageSquare,
  Sparkles,
  NotebookPen,
} from 'lucide-react';

// Match Taskbar type colors (classy low-alpha usage)
const TYPE_COLORS: Record<string, string> = {
  logbook: '#7c3aed', // purple-600
  booking_calendar: '#0ea5e9', // sky-500
  inventory: '#f59e0b', // amber-500
  hotkeys: '#64748b', // slate-500
  kundekort_search: '#10b981', // emerald-500
};

function colorForCmd(id: string): string {
  // Map command ids to window types used in Taskbar
  if (id === 'new_customer' || id === 'go_customer') return TYPE_COLORS.kundekort_search;
  if (id === 'new_booking' || id === 'go_booking') return TYPE_COLORS.booking_calendar;
  if (id === 'new_log' || id === 'go_logbook') return TYPE_COLORS.logbook;
  if (id === 'new_order' || id === 'go_inventory') return TYPE_COLORS.inventory;
  if (id === 'new_message') return TYPE_COLORS.hotkeys;
  if (id === 'new_insight') return TYPE_COLORS.booking_calendar;
  return '#64748b'; // fallback slate
}

function hexToRgba(hex: string, a: number) {
  const m = hex.replace('#', '');
  const n = parseInt(
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m,
    16,
  );
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** Motion */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE = 'cubic-bezier(.22,.7,.2,1)';

type PaletteWindow = Window & Record<string, unknown>;

/** Safe window event (SSR/HMR proof) */
function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (e: WindowEventMap[K]) => void,
  deps?: React.DependencyList,
): void;
function useWindowEvent(
  type: string,
  handler: (e: Event) => void,
  deps?: React.DependencyList,
): void;
function useWindowEvent(
  type: string,
  handler: (e: Event) => void,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctrl = new AbortController();
    window.addEventListener(type, handler as EventListener, { signal: ctrl.signal });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Prevent duplicate palette instances across HMR: keep a stable singleton flag on window */
function useSingletonGuard(key = '__CLAIRITY_CMD_PALETTE__') {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const w = window as unknown as PaletteWindow;
    if (w[key]) {
      setOk(false);
      return;
    }
    w[key] = true;
    setOk(true);
    return () => {
      if (w[key]) delete w[key];
    };
  }, [key]);
  return ok;
}

type Cmd = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  section: 'create' | 'navigate';
  keywords?: string[];
  onTrigger: () => void;
};

export default function CommandPalette() {
  const openDesktop = useDesktop(useShallow((s) => s.open));
  const singletonOk = useSingletonGuard();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Global shortcut + programmatic open
  useWindowEvent(
    'keydown',
    (ke) => {
      const mod = ke.metaKey || ke.ctrlKey;
      if (mod && ke.shiftKey && ke.key?.toLowerCase() === 'p') {
        ke.preventDefault();
        setOpen(true);
      }
      if (ke.key === 'Escape') setOpen(false);
    },
    [],
  );

  useWindowEvent('open-command-palette', () => setOpen(true), []);

  // Autofocus + entry anim
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    if (!prefersReducedMotion()) {
      const card = cardRef.current;
      card?.animate(
        [
          { transform: 'translateY(8px) scale(.985)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ],
        { duration: 300, easing: EASE, fill: 'both' },
      );
    }
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Commands
  const COMMANDS: Cmd[] = useMemo(() => {
    return [
      // Create
      {
        id: 'new_customer',
        section: 'create',
        label: 'Ny kunde',
        icon: <User className="h-4 w-4" />,
        keywords: ['kunde', 'customer', 'crm', 'opret', 'scan', 'sundhedskort', 'id'],
        onTrigger: () => {
          const fn = (window as any).__openIdScan;
          if (typeof fn === 'function') {
            fn(); // call directly when available
          } else {
            // fallback to custom event (TopBar listens to both window & document)
            const evt = new CustomEvent('open-id-scan');
            window.dispatchEvent(evt);
            document.dispatchEvent(evt);
          }
        },
      },
      {
        id: 'new_booking',
        section: 'create',
        label: 'Ny booking',
        icon: <CalendarIcon className="h-4 w-4" />,
        keywords: ['booking', 'kalender', 'aftale', 'tid'],
        onTrigger: () =>
          openDesktop({
            type: 'booking_calendar',
            title: 'Kalender',
            payload: { intent: 'newBooking' },
          }),
      },
      {
        id: 'new_log',
        section: 'create',
        label: 'Nyt logbogsnotat',
        icon: <FileText className="h-4 w-4" />,
        keywords: ['logbog', 'note', 'journal'],
        onTrigger: () =>
          openDesktop({ type: 'logbook', title: 'Logbog', payload: { intent: 'newEntry' } }),
      },
      {
        id: 'new_order',
        section: 'create',
        label: 'Ny ordre',
        icon: <Package className="h-4 w-4" />,
        keywords: ['ordre', 'salg', 'køb'],
        onTrigger: () =>
          openDesktop({ type: 'inventory', title: 'Varer', payload: { intent: 'newOrder' } }),
      },
      {
        id: 'new_message',
        section: 'create',
        label: 'Ny besked til kunde',
        icon: <MessageSquare className="h-4 w-4" />,
        keywords: ['besked', 'sms', 'mail'],
        onTrigger: () =>
          openDesktop({ type: 'logbook', title: 'Logbog', payload: { intent: 'newMessage' } }),
      },
      {
        id: 'new_insight',
        section: 'create',
        label: 'Opret indblik (dashboard)',
        icon: <Sparkles className="h-4 w-4" />,
        keywords: ['indblik', 'analytics', 'dashboard'],
        onTrigger: () =>
          openDesktop({ type: 'hotkeys', title: 'Indblik', payload: { intent: 'createInsight' } }),
      },

      // Navigate
      {
        id: 'go_customer',
        section: 'navigate',
        label: 'Gå til Kundekort',
        icon: <User className="h-4 w-4" />,
        onTrigger: () => openDesktop({ type: 'customer', title: 'Kundekort', payload: {} }),
      },
      {
        id: 'go_booking',
        section: 'navigate',
        label: 'Gå til Booking',
        icon: <CalendarIcon className="h-4 w-4" />,
        onTrigger: () => openDesktop({ type: 'booking_calendar', title: 'Kalender', payload: {} }),
      },
      {
        id: 'go_logbook',
        section: 'navigate',
        label: 'Gå til Logbog',
        icon: <NotebookPen className="h-4 w-4" />,
        onTrigger: () => openDesktop({ type: 'logbook', title: 'Logbog', payload: {} }),
      },
      {
        id: 'go_inventory',
        section: 'navigate',
        label: 'Gå til Varer',
        icon: <Package className="h-4 w-4" />,
        onTrigger: () => openDesktop({ type: 'inventory', title: 'Varer', payload: {} }),
      },
    ];
  }, [openDesktop]);

  const FLAT = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter((c) => {
      const hay = [c.label, ...(c.keywords ?? [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [COMMANDS, query]);

  useEffect(() => setFocusedIdx(FLAT.length ? 0 : -1), [query, FLAT.length]);

  const trigger = (cmd?: Cmd) => {
    if (!cmd) return;
    cmd.onTrigger();
    setOpen(false);
  };

  // only render once at app root
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !singletonOk) return null;

  return createPortal(
    <div
      aria-hidden={!open}
      style={{ display: open ? 'block' : 'none' }}
      className={cn('fixed inset-0 z-[96] pointer-events-none', open ? 'opacity-100' : 'opacity-0')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div className="pointer-events-auto absolute inset-0" onMouseDown={() => setOpen(false)}>
        <div
          className="absolute inset-0 opacity-95"
          style={{
            backdropFilter: 'blur(28px) saturate(155%)',
            WebkitBackdropFilter: 'blur(28px) saturate(155%)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,.66), rgba(255,255,255,.48))',
          }}
        />
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-80"
          style={{
            background:
              'radial-gradient(900px 520px at 50% -10%, rgba(56,189,248,.22), transparent 60%), radial-gradient(800px 480px at 60% -8%, rgba(14,165,233,.20), transparent 55%)',
          }}
        />
      </div>

      {/* Card */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        ref={cardRef}
        className="pointer-events-auto mx-auto mt-20 w-[min(940px,92vw)] overflow-hidden rounded-2xl border border-border/70 bg-surface/70 ring-1 ring-white/45 shadow-[0_30px_120px_rgba(0,0,0,.18)]"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="relative border-b border-border/70 p-2">
          <div className="flex items-center gap-2 rounded-xl bg-surface/65 px-3 py-2 ring-1 ring-border">
            <Plus className="h-4 w-4 opacity-70" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIdx(0);
              }}
              onKeyDown={(e) => {
                if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key))
                  e.preventDefault();
                if (e.key === 'ArrowDown')
                  setFocusedIdx((i) => (FLAT.length ? Math.min(FLAT.length - 1, i + 1) : -1));
                if (e.key === 'ArrowUp')
                  setFocusedIdx((i) => (FLAT.length ? Math.max(0, i - 1) : -1));
                if (e.key === 'Tab')
                  setFocusedIdx((i) => (FLAT.length ? Math.min(FLAT.length - 1, i + 1) : -1));
                if (e.key === 'Enter') trigger(FLAT[focusedIdx]);
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Opret eller navigér… (fx “Ny kunde”, “Booking”, “Logbog”)"
              className="flex-1 bg-transparent placeholder:text-foreground/65 text-[15px] outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="ml-1 hidden items-center gap-1 text-[11px] text-foreground/60 sm:flex">
              <kbd className="rounded border border-border px-1">↑</kbd>
              <kbd className="rounded border border-border px-1">↓</kbd>
              <span>vælg</span>
              <kbd className="ml-2 rounded border border-border px-1">Enter</kbd>
              <span>udfør</span>
              <kbd className="ml-2 rounded border border-border px-1">Esc</kbd>
              <span>luk</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Results */}
          <div className="md:col-span-2 max-h-[56vh] overflow-auto p-2">
            {!query && (
              <div className="px-2 py-6 text-[15px] text-foreground/75">
                Skriv for at oprette eller navigere…
              </div>
            )}
            {query && FLAT.length === 0 && (
              <div className="px-2 py-6 text-[15px] text-foreground/75">
                Ingen match for “{query}”.
              </div>
            )}

            {(['create', 'navigate'] as const).map((sectionKey) => {
              const sectionLabel = sectionKey === 'create' ? 'Opret' : 'Navigér';
              const items = FLAT.filter((c) => c.section === sectionKey);
              if (!items.length) return null;
              return (
                <div key={sectionKey} className="px-1 py-1">
                  <div className="sticky top-0 z-10 -mx-1 mb-1 bg-surface/80 px-2 py-1 text-[12px] uppercase tracking-wide text-foreground/70 backdrop-blur">
                    {sectionLabel}
                  </div>
                  {items.map((cmd) => {
                    const i = FLAT.indexOf(cmd);
                    const active = i === focusedIdx;
                    const HEX = colorForCmd(cmd.id);
                    return (
                      <button
                        key={cmd.id}
                        role="option"
                        aria-selected={active}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-lg transition-[background,box-shadow,transform] duration-150',
                          active ? 'ring-1' : 'hover:bg-surface-2',
                        )}
                        style={
                          active
                            ? {
                                backgroundColor: hexToRgba(HEX, 0.1),
                                boxShadow: `0 4px 14px ${hexToRgba(HEX, 0.12)}`,
                                borderColor: hexToRgba(HEX, 0.32),
                              }
                            : undefined
                        }
                        onMouseEnter={() => setFocusedIdx(i)}
                        onClick={() => trigger(cmd)}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="grid h-6 w-6 place-items-center rounded-md ring-1 text-foreground/90"
                            style={{
                              backgroundColor: hexToRgba(HEX, 0.12),
                              borderColor: hexToRgba(HEX, 0.3),
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
                            }}
                          >
                            {cmd.icon ?? <Sparkles className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-medium">{cmd.label}</div>
                            {cmd.hint && (
                              <div className="text-[12px] text-foreground/70">{cmd.hint}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Preview / Tips */}
          <aside className="hidden md:block border-l border-border/70 bg-surface/60 p-3">
            <div className="text-[12px] uppercase tracking-wide text-foreground/60 mb-2">Tips</div>
            <ul className="space-y-1 text-[13px] text-foreground/80">
              <li>⌘⇧P — åbn palette</li>
              <li>↑/↓ — vælg · Enter — udfør</li>
              <li>Skriv fx “kunde”, “booking”, “logbog”…</li>
            </ul>
          </aside>
        </div>
      </section>
    </div>,
    document.body,
  );
}
