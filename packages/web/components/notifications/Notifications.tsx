'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  Bell,
  BellOff,
  X,
  Check,
  Package,
  Calendar,
  FileText,
  MessageSquare,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

// shadcn tooltip
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// 🔔 shared store (single source of truth for unread + list)
import { useNotifications } from '@/store/notifications';

/* ============================================================================
   Feature flags
============================================================================ */
const ENABLE_SWIPE = false; // future: swipe to archive/snooze (kept off)

/* ============================================================================
   Types
============================================================================ */

export type NotificationKind = 'order' | 'calendar' | 'message' | 'report' | 'feature' | 'system';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  when: string; // "2m", "1h", "Yesterday"
  read?: boolean;
  href?: string;
  meta?: Record<string, unknown>;
};

export type NotificationsProps = {
  items?: NotificationItem[]; // controlled
  initialItems?: NotificationItem[]; // uncontrolled seed
  onItemsChange?: (items: NotificationItem[]) => void;
  className?: string; // bell button
  theme?: Partial<Record<NotificationKind, Partial<NotifTheme>>>;
};

const TODAY_KEYS = new Set([
  'now',
  '1m',
  '2m',
  '5m',
  '10m',
  '14m',
  '30m',
  '1h',
  '2h',
  'Today',
]);

/* ============================================================================
   Theme
============================================================================ */

type NotifTheme = {
  icon: React.ReactNode;
  tone: 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'zinc';
};

type AnchorProps = React.ComponentPropsWithoutRef<'button'>;
type AnchorElement = React.ReactElement<AnchorProps>;

const DEFAULT_THEME: Record<NotificationKind, NotifTheme> = {
  order: { icon: <Package className="h-4 w-4" />, tone: 'emerald' },
  calendar: { icon: <Calendar className="h-4 w-4" />, tone: 'sky' },
  message: { icon: <MessageSquare className="h-4 w-4" />, tone: 'violet' },
  report: { icon: <FileText className="h-4 w-4" />, tone: 'amber' },
  feature: { icon: <Sparkles className="h-4 w-4" />, tone: 'sky' },
  system: { icon: <AlertTriangle className="h-4 w-4" />, tone: 'rose' },
};

const TONES: Record<
  NotifTheme['tone'],
  { chip: string; dot: string; ring: string; glow: string; tint: string; badge: string }
> = {
  sky: {
    chip: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
    ring: 'ring-sky-300/55',
    glow: 'shadow-[0_14px_36px_-12px_rgba(2,132,199,.45)]',
    tint: 'rgba(2,132,199,.22)',
    badge: 'bg-sky-600',
  },
  emerald: {
    chip: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-300/55',
    glow: 'shadow-[0_14px_36px_-12px_rgba(5,150,105,.45)]',
    tint: 'rgba(5,150,105,.22)',
    badge: 'bg-emerald-600',
  },
  violet: {
    chip: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    ring: 'ring-violet-300/55',
    glow: 'shadow-[0_14px_36px_-12px_rgba(124,58,237,.45)]',
    tint: 'rgba(124,58,237,.22)',
    badge: 'bg-violet-600',
  },
  amber: {
    chip: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    ring: 'ring-amber-300/55',
    glow: 'shadow-[0_14px_36px_-12px_rgba(217,119,6,.45)]',
    tint: 'rgba(217,119,6,.22)',
    badge: 'bg-amber-600',
  },
  rose: {
    chip: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    ring: 'ring-rose-300/55',
    glow: 'shadow-[0_14px_36px_-12px_rgba(190,18,60,.45)]',
    tint: 'rgba(190,18,60,.22)',
    badge: 'bg-rose-600',
  },
  zinc: {
    chip: 'bg-zinc-100 text-zinc-700',
    dot: 'bg-zinc-500',
    ring: 'ring-zinc-300/55',
    glow: 'shadow-[0_14px_36px_-12px_rgba(39,39,42,.35)]',
    tint: 'rgba(39,39,42,.18)',
    badge: 'bg-zinc-600',
  },
};

/* ============================================================================
   Liquid Glass card
============================================================================ */

const NOISE_BG =
  "url(\"data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>\
<filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='3' type='fractalNoise'/>\
<feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 .06 .20 0'/></feComponentTransfer></filter>\
<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

function GlassCard({
  className,
  children,
  tone = 'sky',
}: React.PropsWithChildren<{ className?: string; tone?: NotifTheme['tone'] }>) {
  const t = TONES[tone] ?? TONES.sky;
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', t.glow, className)}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,.86), rgba(255,255,255,.64)),' +
            'radial-gradient(120% 160% at 60% 120%, rgba(0,0,0,.08), rgba(0,0,0,0) 55%)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${t.tint} 0%, transparent 60%)` }}
      />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,.75),inset_0_-1px_0_rgba(0,0,0,.08)]" />
      <div className={cn('pointer-events-none absolute inset-0 rounded-2xl ring-1', t.ring)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(255,255,255,.95),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[.10] mix-blend-soft-light"
        style={{ backgroundImage: NOISE_BG }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ============================================================================
   Glass controls (compact, no fixed heights)
============================================================================ */

function GlassButton({
  children,
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium leading-[1.1] whitespace-nowrap select-none',
        'bg-white/55 hover:bg-white/70 active:bg-white/80 ring-1 ring-white/60 shadow-sm transition',
        className
      )}
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      {children}
    </button>
  );
}

const FilterChip = React.memo(function FilterChip({
  active,
  label,
  value,
  onSelect,
}: {
  active: boolean;
  label: string;
  value: 'all' | NotificationKind;
  onSelect: (value: 'all' | NotificationKind) => void;
}) {
  const handleClick = React.useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold leading-[1] whitespace-nowrap ring-1 shadow-sm transition-colors',
        active
          ? 'bg-zinc-900/85 text-white ring-white/50'
          : 'bg-white/55 text-zinc-800 hover:bg-white/70 ring-white/60'
      )}
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      {label}
    </button>
  );
});

/* ============================================================================
   Popover (smart position, slower animated open) + small top gap
============================================================================ */

function useOutside(handler: () => void) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [handler]);
  return ref;
}
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);

type PointerGestureEvent =
  | React.PointerEvent<HTMLDivElement>
  | React.TouchEvent<HTMLDivElement>;

const pointerClientX = (event: PointerGestureEvent) => {
  if ('touches' in event && event.touches?.[0]) {
    return event.touches[0].clientX;
  }
  if ('clientX' in event) {
    return event.clientX;
  }
  return 0;
};

const resolveItemsAction = (
  action: React.SetStateAction<NotificationItem[]>,
  base: NotificationItem[]
) => (typeof action === 'function' ? action(base) : action);

function Popover({
  open,
  onOpenChange,
  anchor,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  anchor: AnchorElement;
  children: React.ReactNode;
}) {
  const [pos, setPos] = React.useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [panelW, setPanelW] = React.useState(420);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const wrapRef = useOutside(() => onOpenChange(false));
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const buttonEl = anchor as React.ReactElement<React.ComponentPropsWithRef<'button'>>;

  React.useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const left = clamp(r.left + r.width - panelW, 8, Math.max(8, vw - panelW - 8));
    setPos({ left, top: r.bottom + 12 }); // +12px extra breathing room
  }, [open, panelW]);

  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const w = panelRef.current.offsetWidth || 420;
    if (w !== panelW) setPanelW(w);
  }, [open, panelW]);

  return (
    <>
      {React.cloneElement(
        buttonEl,
        {
          ref: btnRef,
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            anchor.props.onClick?.(e);
            onOpenChange(!open);
          },
        } as unknown as React.Attributes & React.ComponentPropsWithRef<'button'>
      )}
      {open && (
        <div ref={wrapRef} className="fixed z-[70]" style={{ left: pos.left, top: pos.top }}>
          <div ref={panelRef} className="notif-pop-enter">
            {children}
          </div>

          {/* Slower, smoother */}
          <style jsx>{`
            @media (prefers-reduced-motion: no-preference) {
              .notif-pop-enter {
                opacity: 0;
                transform: translateY(8px) scale(0.985);
                animation: popIn 0.3s cubic-bezier(0.22, 0.7, 0.2, 1) forwards;
              }
              @keyframes popIn {
                60% {
                  opacity: 1;
                  transform: translateY(0) scale(1.005);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   Rows + Panel
============================================================================ */

const NotifRow = React.memo(function NotifRow({
  n,
  theme,
  onToggleRead,
  onOpen,
  focused,
  onFocus,
  idx,
  animateDelayMs = 0,
}: {
  n: NotificationItem;
  theme: NotifTheme;
  onToggleRead: (id: string) => void;
  onOpen: (id: string) => void;
  focused?: boolean;
  onFocus?: () => void;
  idx?: number;
  animateDelayMs?: number;
}) {
  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    if (focused) rowRef.current?.focus({ preventScroll: true });
  }, [focused]);

  const dragRef = React.useRef<{ x: number; active: boolean }>({ x: 0, active: false });
  const handleRowClick = React.useCallback(() => onOpen(n.id), [n.id, onOpen]);
  const handleToggle = React.useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      event?.stopPropagation();
      setPulse(true);
      onToggleRead(n.id);
      setTimeout(() => setPulse(false), 320);
    },
    [n.id, onToggleRead]
  );

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      aria-posinset={idx}
      onFocus={onFocus}
      onKeyDown={(e) => {
        const k = e.key.toLowerCase?.();
        if (k === 'enter' || k === ' ') {
          e.preventDefault();
          handleRowClick();
        }
        if (k === 'r') {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={cn(
        'w-full rounded-2xl border p-3 text-left transition',
        'bg-white/58 hover:bg-white/68 active:bg-white/78 ring-1 ring-white/60 shadow-sm',
        focused && 'outline-none ring-[2.5px] ring-sky-400/50',
        pulse && 'animate-[rowPulse_.32s_ease-out]'
      )}
      style={{
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        animation: 'none',
        ...(typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: no-preference)').matches
          ? { animation: `rowIn .28s ${animateDelayMs}ms cubic-bezier(.2,.8,.2,1) both` }
          : {}),
      }}
      {...(ENABLE_SWIPE
        ? {
            onPointerDown: (e: PointerGestureEvent) => {
              dragRef.current = { x: pointerClientX(e), active: true };
            },
            onPointerMove: (e: PointerGestureEvent) => {
              if (!dragRef.current.active) return;
              const cur = pointerClientX(e);
              const dx = Math.max(-24, Math.min(24, cur - dragRef.current.x));
              const rowEl = rowRef.current;
              if (!rowEl) return;
              rowEl.style.transform = `translateX(${dx}px)`;
            },
            onPointerUp: () => {
              dragRef.current.active = false;
              const rowEl = rowRef.current;
              if (rowEl) rowEl.style.transform = '';
            },
          }
        : {})}
      onClick={handleRowClick}
    >
      {/* grid: content + fixed dot column on the right */}
      <div className="grid grid-cols-[1fr_22px] gap-2">
        {/* Left: chip + text + pill */}
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-xl shrink-0',
                (TONES[theme.tone] ?? TONES.zinc).chip
              )}
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.66), inset 0 -1px 0 rgba(0,0,0,.08)',
              }}
            >
              {theme.icon}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-baseline gap-2">
                <div className="truncate text-[14px] font-semibold tracking-[.01em] text-zinc-900">
                  {n.title}
                </div>
                <span className="ml-auto shrink-0 text-[11px] text-zinc-500">{n.when}</span>
              </div>

              {n.body && (
                <div className="text-[13px] leading-snug text-zinc-700 line-clamp-2">{n.body}</div>
              )}

              <div className="pt-1">
                <GlassButton
                  title={n.read ? 'Markér som ulæst' : 'Markér som læst'}
                  onClick={handleToggle}
                >
                  {n.read ? 'Markér som ulæst' : 'Markér som læst'}
                  <Check className="h-4 w-4" />
                </GlassButton>
              </div>
            </div>
          </div>
        </div>

        {/* Right: fixed dot column (tappable) */}
        <div className="flex items-start justify-end">
          <button
            type="button"
            aria-label={n.read ? 'Markér som ulæst' : 'Markér som læst'}
            onClick={handleToggle}
            className="relative inline-flex h-5 w-5 items-center justify-center rounded-full"
            title={n.read ? 'Markér som ulæst' : 'Markér som læst'}
          >
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full transition-all duration-200',
                n.read ? 'opacity-0 scale-75' : 'opacity-100 scale-100',
                (TONES[theme.tone] ?? TONES.zinc).dot
              )}
              style={{ boxShadow: n.read ? 'none' : '0 0 0 3px rgba(2,132,199,.10)' }}
            />
          </button>
        </div>
      </div>

      {/* Row animations */}
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes rowIn {
            0% {
              opacity: 0;
              transform: translateY(4px) scale(0.995);
            }
            60% {
              opacity: 1;
              transform: translateY(0) scale(1.004);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes rowPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(2, 132, 199, 0);
            }
            40% {
              box-shadow: 0 6px 18px -8px rgba(2, 132, 199, 0.35);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(2, 132, 199, 0);
            }
          }
        }
      `}</style>
    </div>
  );
});

/* Horizontal chip scroller with hidden scrollbar + fading edges */
function ChipStrip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-2 relative"
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
      }}
    >
      <div
        className="flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
            height: 0;
          }
        `}</style>
        {children}
      </div>
    </div>
  );
}

/* ============================================================================
   Panel
============================================================================ */

function Panel({
  items,
  setItems,
  onClose,
  themeMap,
}: {
  items: NotificationItem[];
  setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onClose: () => void;
  themeMap: Record<NotificationKind, NotifTheme>;
}) {
  const [filter, setFilter] = React.useState<'all' | NotificationKind>('all');
  const [focused, setFocused] = React.useState(0);
  const [dnd, setDnd] = React.useState(false);
  const handleFilterSelect = React.useCallback(
    (next: 'all' | NotificationKind) => setFilter(next),
    [setFilter]
  );

  const list = React.useMemo(
    () => (filter === 'all' ? items : items.filter((n) => n.kind === filter)),
    [items, filter]
  );
  const unread = list.filter((n) => !n.read).length;

  const markAllRead = React.useCallback(() => setItems((xs) => xs.map((x) => ({ ...x, read: true }))), [
    setItems,
  ]);
  const clearAll = React.useCallback(() => setItems([]), [setItems]);
  const toggleRead = React.useCallback(
    (id: string) =>
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: !x.read } : x))),
    [setItems]
  );
  const toggleDnd = React.useCallback(() => setDnd((v) => !v), [setDnd]);
  const open = React.useCallback(
    (id: string) => {
      toggleRead(id);
      onClose();
    },
    [onClose, toggleRead]
  );

  const isToday = React.useCallback((w: string) => TODAY_KEYS.has(w), []);
  const { today, earlier } = React.useMemo(() => {
    const grouped = { today: [] as NotificationItem[], earlier: [] as NotificationItem[] };
    for (const notif of list) {
      if (isToday(notif.when)) grouped.today.push(notif);
      else grouped.earlier.push(notif);
    }
    return grouped;
  }, [isToday, list]);

  // collapse earlier to 2 items by default
  const [showMoreEarlier, setShowMoreEarlier] = React.useState(false);
  const earlierShown = showMoreEarlier ? earlier : earlier.slice(0, 2);

  // Keyboard list nav
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase?.();
      if (k === 'arrowdown') {
        e.preventDefault();
        setFocused((i) => Math.min(i + 1, today.length + earlierShown.length - 1));
      }
      if (k === 'arrowup') {
        e.preventDefault();
        setFocused((i) => Math.max(i - 1, 0));
      }
      if (k === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        markAllRead();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [today.length, earlierShown.length, markAllRead]);

  React.useEffect(() => {
    setFocused(0);
  }, [filter]);

  const baseDelay = 60; // row stagger

  return (
    <TooltipProvider delayDuration={150}>
      <GlassCard className="w-[420px] max-w-[92vw]" tone="sky">
        {/* Header */}
        <div className="px-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-white/60">
                {dnd ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="text-[13px] font-semibold text-zinc-900">Notifikationer</div>
              {unread > 0 && (
                <span
                  className={cn(
                    'ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow',
                    TONES.sky.badge
                  )}
                >
                  {unread}
                </span>
              )}
            </div>

            {/* Icon-only actions with tooltips */}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <GlassButton title="Markér alle som læst" onClick={markAllRead}>
                    <Check className="h-4 w-4" />
                  </GlassButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Markér alle som læst</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <GlassButton title="Ryd alle" onClick={clearAll}>
                    <X className="h-4 w-4" />
                  </GlassButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Ryd alle</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <GlassButton
                    title={dnd ? 'Deaktivér DND' : 'Aktivér DND'}
                    onClick={toggleDnd}
                  >
                    {dnd ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </GlassButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {dnd ? 'Deaktivér DND' : 'Aktivér DND'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <GlassButton title="Luk" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </GlassButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Luk</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Filter strip */}
          <ChipStrip>
            <FilterChip
              active={filter === 'all'}
              label="Alle"
              value="all"
              onSelect={handleFilterSelect}
            />
            <FilterChip
              active={filter === 'order'}
              label="Ordrer"
              value="order"
              onSelect={handleFilterSelect}
            />
            <FilterChip
              active={filter === 'calendar'}
              label="Kalender"
              value="calendar"
              onSelect={handleFilterSelect}
            />
            <FilterChip
              active={filter === 'message'}
              label="Beskeder"
              value="message"
              onSelect={handleFilterSelect}
            />
            <FilterChip
              active={filter === 'report'}
              label="Rapporter"
              value="report"
              onSelect={handleFilterSelect}
            />
            <FilterChip
              active={filter === 'feature'}
              label="Funktioner"
              value="feature"
              onSelect={handleFilterSelect}
            />
            <FilterChip
              active={filter === 'system'}
              label="System"
              value="system"
              onSelect={handleFilterSelect}
            />
          </ChipStrip>
        </div>

        {/* List */}
        <div
          ref={containerRef}
          className="mt-2 max-h-[60vh] overflow-auto px-3 pb-3 focus:outline-none"
          tabIndex={0}
          role="region"
          aria-label="Notifikationer"
        >
          {today.length > 0 && (
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              I dag
            </div>
          )}
          <div className="grid gap-2">
            {today.map((n, i) => (
              <NotifRow
                key={n.id}
                n={n}
                idx={i + 1}
                theme={themeMap[n.kind]}
                onToggleRead={toggleRead}
                onOpen={open}
                focused={i === focused}
                onFocus={() => setFocused(i)}
                animateDelayMs={i * baseDelay}
              />
            ))}
          </div>

          {earlier.length > 0 && (
            <>
              <div className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Tidligere
              </div>
              <div className="grid gap-2">
                {earlierShown.map((n, i) => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    idx={i + 1 + today.length}
                    theme={themeMap[n.kind]}
                    onToggleRead={toggleRead}
                    onOpen={open}
                    focused={i + today.length === focused}
                    onFocus={() => setFocused(i + today.length)}
                    animateDelayMs={(i + today.length) * baseDelay}
                  />
                ))}
              </div>

              {earlier.length > earlierShown.length && (
                <div className="mt-2">
                  <GlassButton onClick={() => setShowMoreEarlier(true)}>Vis flere…</GlassButton>
                </div>
              )}
            </>
          )}

          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
              <Check className="mb-2 h-6 w-6" />
              <div className="text-[13px] font-medium">Alt er indhentet</div>
              <div className="text-[12px]">Ingen nye notifikationer</div>
            </div>
          )}
        </div>
      </GlassCard>
    </TooltipProvider>
  );
}

/* ============================================================================
   Public bell
============================================================================ */

function NotificationsBellComponent(props: NotificationsProps) {
  const { items: controlled, initialItems, onItemsChange, className, theme } = props;

  // Merge theme overrides
  const mergedTheme: Record<NotificationKind, NotifTheme> = React.useMemo(() => {
    const t = { ...DEFAULT_THEME } as Record<NotificationKind, NotifTheme>;
    if (theme)
      for (const k of Object.keys(theme) as NotificationKind[])
        t[k] = { ...t[k], ...(theme[k] as Partial<NotifTheme>) };
    return t;
  }, [theme]);

  const [open, setOpen] = React.useState(false);
  const handleClosePanel = React.useCallback(() => setOpen(false), [setOpen]);

  // Shared store
  const notif = useNotifications();

  // Seed the store once from initialItems if provided and store is empty
  React.useEffect(() => {
    if (initialItems && initialItems.length) {
      useNotifications.getState().seedIfEmpty(initialItems);
    }
  }, [initialItems]);

  // Select items: controlled takes precedence, otherwise store
  const items = controlled ?? notif.items;

  // Setter that routes either to controlled onItemsChange or to the store
  const setItems = React.useCallback(
    (updater: React.SetStateAction<NotificationItem[]>) => {
      if (controlled) {
        const next = resolveItemsAction(updater, controlled);
        onItemsChange?.(next);
      } else {
        const prev = useNotifications.getState().items;
        const next = resolveItemsAction(updater, prev);
        notif.set(next);
        onItemsChange?.(next);
      }
    },
    [controlled, notif, onItemsChange]
  );

  const unread = controlled ? items.filter((n) => !n.read).length : notif.unread;

  const anchor = (
    <button
      type="button"
      title="Notifikationer"
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg px-2.5 py-2',
        'bg-white/55 hover:bg-white/70 active:bg-white/80 text-zinc-800 hover:text-zinc-900',
        'ring-1 ring-white/60 shadow-sm transition-colors select-none',
        className
      )}
      aria-haspopup="dialog"
      aria-expanded={open}
      style={{
        touchAction: 'manipulation',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span
          className={cn(
            'absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white shadow',
            TONES.sky.badge // ✅ blue badge
          )}
          style={{ height: 20 }}
        >
          {unread}
        </span>
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} anchor={anchor}>
      <Panel
        items={items}
        setItems={setItems}
        onClose={handleClosePanel}
        themeMap={mergedTheme}
      />
    </Popover>
  );
}

const NotificationsBell = React.memo(NotificationsBellComponent);

export { NotificationsBell };
export default NotificationsBell;
