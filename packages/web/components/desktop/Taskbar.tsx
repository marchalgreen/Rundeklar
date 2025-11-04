'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useDesktop, WinState } from '@/store/desktop';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';
import { computeWorkArea } from '@/lib/workArea';
import Portal from '@/components/Portal';
import { MonitorDown, MonitorUp } from 'lucide-react'; // icons for the button

// Icons
import {
  BookOpen,
  CalendarDays,
  Package,
  Keyboard,
  Search,
  NotebookPen,
  UserCircle2,
  X as XIcon,
} from 'lucide-react';

type Ctx = { x: number; y: number; winId: string } | null;

const TYPE_COLORS: Record<string, string> = {
  logbook: '#7c3aed',
  booking_calendar: '#0ea5e9',
  inventory: '#f59e0b',
  hotkeys_help: '#64748b',
  hotkeys: '#64748b',
  kundekort_search: '#10b981',
};

const TypeIcon = memo(function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const common = { size, strokeWidth: 2 };
  switch (type) {
    case 'logbook':
      return <BookOpen {...common} />;
    case 'booking_calendar':
      return <CalendarDays {...common} />;
    case 'inventory':
      return <Package {...common} />;
    case 'hotkeys_help':
    case 'hotkeys':
      return <Keyboard {...common} />;
    case 'kundekort_search':
      return <Search {...common} />;
    case 'synsJournal':
      return <NotebookPen {...common} />;
    case 'customer':
    case 'customerForm':
    default:
      return <UserCircle2 {...common} />;
  }
});

function useClock() {
  // Start null so server renders stable output
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Set once on mount, then tick every 30s
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia?.('(hover: none), (pointer: coarse)');
    const maxTouchPoints = 'maxTouchPoints' in navigator ? navigator.maxTouchPoints : 0;
    const detect = 'ontouchstart' in window || maxTouchPoints > 0 || mql?.matches;
    setTouch(!!detect);
    const onChange = () => setTouch(!!mql?.matches);
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);
  return touch;
}

function deskRect() {
  const d = computeWorkArea();
  return new DOMRect(d.x, d.y, d.w, d.h);
}
function animateRestoreFromTaskbar(src: DOMRect, to: DOMRect, ms = 220) {
  const g = document.createElement('div');
  Object.assign(g.style, {
    position: 'fixed',
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    borderRadius: '16px',
    background: 'white',
    boxShadow: '0 28px 80px rgba(0,0,0,.24), 0 8px 24px rgba(0,0,0,.14)',
    zIndex: '100000',
    transformOrigin: 'center center',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(g);

  const srcCx = src.left + src.width / 2;
  const srcCy = src.top + src.height / 2;
  const toCx = to.left + to.width / 2;
  const toCy = to.top + to.height / 2;

  const scaleFrom = Math.max(
    0.22,
    Math.min(0.36, Math.min(src.width / to.width, src.height / to.height))
  );
  const dx = srcCx - toCx;
  const dy = srcCy - toCy;

  g.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scaleFrom})`, opacity: 0.8 },
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
    ],
    { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
  );

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      g.remove();
      resolve();
    }, ms);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
export default function Taskbar() {
  const {
    windows,
    order,
    focusedId,
    focus,
    close,
    minimize,
    restore,
    toggleShowDesktop,
    hiddenDesktopSnapshot,
  } = useDesktop(
    useShallow((s) => ({
      windows: s.windows,
      order: s.order,
      focusedId: s.order[s.order.length - 1] ?? null,
      focus: s.focus,
      close: s.close,
      minimize: s.minimize,
      restore: s.restore,
      toggleShowDesktop: s.toggleShowDesktop,
      hiddenDesktopSnapshot: s.hiddenDesktopSnapshot,
    }))
  );

  const [ctx, setCtx] = useState<Ctx>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const timers = useRef<{ open?: number; close?: number }>({});
  const now = useClock();
  const isTouch = useIsTouch();

  useEffect(() => {
    const onDocClick = () => {
      setCtx(null);
      setOpenGroup(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCtx(null);
        setOpenGroup(null);
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('contextmenu', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('contextmenu', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const items: WinState[] = useMemo(
    () => order.map((id) => windows[id]).filter(Boolean) as WinState[],
    [order, windows]
  );

  type TaskbarGroup = {
    id: string;
    wins: WinState[];
    top: WinState;
    title: string;
    hue: number | null | undefined;
    isActive: boolean;
  };

  const groups = useMemo<TaskbarGroup[]>(() => {
    const m = new Map<string, WinState[]>();
    for (const w of items) {
      const gid = w.groupId ?? w.id;
      if (!m.has(gid)) m.set(gid, []);
      m.get(gid)!.push(w);
    }
    return Array.from(m.entries()).map(([gid, arr]) => {
      const sorted = arr.slice().sort((a, b) => a.z - b.z);
      const top = sorted[sorted.length - 1];
      return {
        id: gid,
        wins: sorted,
        top,
        title: top.groupTitle || top.title,
        hue: top.accentHue,
        isActive: top.id === focusedId && !top.minimized,
      };
    });
  }, [items, focusedId]);

  const groupLookup = useMemo(() => {
    const map: Record<string, TaskbarGroup> = {};
    for (const group of groups) map[group.id] = group;
    return map;
  }, [groups]);

  const bringToFront = useCallback(
    async (w: WinState, srcEl: HTMLElement) => {
      if (w.minimized) {
        const src = srcEl.getBoundingClientRect();
        const to = w.maximized ? deskRect() : new DOMRect(w.x, w.y, w.w, w.h);
        const D = 220;
        const anim = animateRestoreFromTaskbar(src, to, D);
        window.setTimeout(() => restore(w.id), Math.round(D * 0.6));
        await anim;
      } else {
        focus(w.id);
      }
    },
    [focus, restore]
  );

  const scheduleOpen = useCallback(
    (gid: string) => {
      if (timers.current.close) window.clearTimeout(timers.current.close);
      timers.current.open = window.setTimeout(() => setOpenGroup(gid), 60);
    },
    [timers, setOpenGroup]
  );
  const scheduleClose = useCallback(
    (gid: string) => {
      if (timers.current.open) window.clearTimeout(timers.current.open);
      timers.current.close = window.setTimeout(() => {
        setOpenGroup((cur) => (cur === gid ? null : cur));
      }, 120);
    },
    [timers, setOpenGroup]
  );

  const handleGroupMouseEnter = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const gid = event.currentTarget.dataset.winGroupId;
      if (gid) scheduleOpen(gid);
    },
    [scheduleOpen]
  );
  const handleGroupMouseLeave = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const gid = event.currentTarget.dataset.winGroupId;
      if (gid) scheduleClose(gid);
    },
    [scheduleClose]
  );

  const handleGroupButtonClick = useCallback(
    async (event: ReactMouseEvent<HTMLButtonElement>) => {
      const host = event.currentTarget.closest('[data-win-group-id]') as HTMLElement | null;
      const gid = host?.dataset.winGroupId;
      if (!gid) return;
      const group = groupLookup[gid];
      if (!group) return;
      await bringToFront(group.top, host ?? event.currentTarget);
    },
    [bringToFront, groupLookup]
  );

  const handleGroupContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const host = event.currentTarget.closest('[data-win-group-id]') as HTMLElement | null;
      const gid = host?.dataset.winGroupId;
      if (!gid) return;
      const group = groupLookup[gid];
      if (!group) return;
      if (event.shiftKey) {
        setCtx({ x: event.clientX, y: event.clientY, winId: group.top.id });
      } else {
        useDesktop.getState().close(group.top.id);
      }
    },
    [groupLookup]
  );

  const handleGroupCountClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const host = event.currentTarget.closest('[data-win-group-id]') as HTMLElement | null;
    const gid = host?.dataset.winGroupId;
    if (!gid) return;
    setOpenGroup((cur) => (cur === gid ? null : gid));
  }, []);

  const handlePanelMouseEnter = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const gid = event.currentTarget.dataset.winGroupId;
      if (gid) scheduleOpen(gid);
    },
    [scheduleOpen]
  );
  const handlePanelMouseLeave = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const gid = event.currentTarget.dataset.winGroupId;
      if (gid) scheduleClose(gid);
    },
    [scheduleClose]
  );

  const handleWinClick = useCallback(
    async (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-close-btn]')) return;
      const host = event.currentTarget.closest('[data-win-group-id]') as HTMLElement | null;
      const winId = event.currentTarget.dataset.winId;
      if (!winId) return;
      const win = windows[winId];
      if (!win) return;
      await bringToFront(win, host ?? event.currentTarget);
      setOpenGroup(null);
    },
    [bringToFront, setOpenGroup, windows]
  );

  const handleWinContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const winId = event.currentTarget.dataset.winId;
    if (!winId) return;
    useDesktop.getState().close(winId);
  }, []);

  const handleWinCloseClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const host = event.currentTarget.closest('[data-win-id]') as HTMLElement | null;
    const winId = host?.dataset.winId;
    if (!winId) return;
    useDesktop.getState().close(winId);
  }, []);

  const isShowingDesktop = hiddenDesktopSnapshot.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[42px] bg-white/80 backdrop-blur border-t border-zinc-200 flex items-center gap-2 px-2">
      {/* Groups */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto">
        {groups.map((g) => {
          const tint =
            g.hue != null ? { boxShadow: `inset 3px 0 0 hsl(${g.hue} 70% 55% / .85)` } : undefined;

          const isCustomerish =
            g.top.type === 'customer' ||
            g.top.type === 'customerForm' ||
            g.top.type === 'synsJournal';

          return (
            <div
              key={g.id}
              data-win-group-id={g.id}
              className={cn(
                'group relative shrink-0 max-w-[260px] truncate rounded-md border h-8',
                g.isActive
                  ? 'border-zinc-300 bg-zinc-100 shadow-inner'
                  : 'border-zinc-200 bg-white',
                'flex items-center pl-2 pr-2 transition hover:ring-2 hover:ring-zinc-300/60 hover:bg-zinc-50'
              )}
              style={tint}
              onMouseEnter={handleGroupMouseEnter}
              onMouseLeave={handleGroupMouseLeave}
            >
              <button
                type="button"
                className="flex-1 truncate text-sm text-left select-none cursor-pointer bg-transparent flex items-center gap-1.5"
                onClick={handleGroupButtonClick}
                onContextMenu={handleGroupContextMenu}
              >
                {!isCustomerish && (
                  <span
                    className="mr-0.5 inline-flex h-5 w-5 items-center justify-center rounded-[6px] border border-zinc-200"
                    style={{ backgroundColor: `${TYPE_COLORS[g.top.type] ?? '#e5e7eb'}22` }}
                    aria-hidden
                  >
                    <span style={{ color: TYPE_COLORS[g.top.type] ?? '#6b7280' }}>
                      <TypeIcon type={g.top.type} size={13} />
                    </span>
                  </span>
                )}
                <span className="pr-2">{g.title}</span>
              </button>

              {g.wins.length > 1 && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded bg-white/80 text-[11px] text-zinc-700 border border-zinc-300"
                  onClick={handleGroupCountClick}
                >
                  {g.wins.length}
                </button>
              )}

              {openGroup === g.id && (
                <Portal>
                  {(() => {
                    const host = document.querySelector(
                      `[data-win-group-id="${g.id}"]`
                    ) as HTMLElement | null;
                    const r = host?.getBoundingClientRect();
                    if (!r) return null;

                    const margin = 9;
                    const minW = 220;
                    const left = Math.max(8, Math.min(r.left, window.innerWidth - minW - 8));
                    const bottom = window.innerHeight - r.top + margin;

                    return (
                      <div
                        className="fixed z-[100000] rounded-md border border-zinc-200 bg-white shadow-lg text-sm overflow-hidden min-w-[220px]"
                        style={{ left, bottom }}
                        data-win-group-id={g.id}
                        onMouseEnter={handlePanelMouseEnter}
                        onMouseLeave={handlePanelMouseLeave}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {g.wins.map((w) => {
                          const isTop = w.id === g.top.id;
                          const short =
                            w.type === 'customerForm' || w.type === 'customer'
                              ? 'KK'
                              : w.type === 'synsJournal'
                              ? 'SJ'
                              : w.type === 'logbook'
                              ? 'LB'
                              : w.type === 'inventory'
                              ? 'VAR'
                              : w.type === 'booking_calendar'
                              ? 'CAL'
                              : w.type === 'kundekort_search'
                              ? 'SØG'
                              : '';

                          const isCust =
                            w.type === 'customer' ||
                            w.type === 'customerForm' ||
                            w.type === 'synsJournal';

                          return (
                            <div
                              key={w.id}
                              data-win-id={w.id}
                              className={cn(
                                'group/item flex w-full items-center gap-2 px-3 py-2 truncate',
                                'hover:bg-zinc-100 focus-within:bg-zinc-100'
                              )}
                              onClick={handleWinClick}
                              onContextMenu={handleWinContextMenu}
                            >
                              {isCust ? (
                                <span
                                  className="inline-block h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: `hsl(${g.hue ?? 260} 70% 55% / .95)` }}
                                  aria-hidden
                                />
                              ) : (
                                <span
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] border border-zinc-200 shrink-0"
                                  style={{
                                    backgroundColor: `${TYPE_COLORS[w.type] ?? '#e5e7eb'}22`,
                                  }}
                                  aria-hidden
                                >
                                  <span style={{ color: TYPE_COLORS[w.type] ?? '#6b7280' }}>
                                    <TypeIcon type={w.type} size={12} />
                                  </span>
                                </span>
                              )}
                              {short && (
                                <span className="inline-flex items-center justify-center h-5 min-w-6 px-1 rounded border border-zinc-200 text-[10px] text-zinc-600 bg-white/80 shrink-0">
                                  {short}
                                </span>
                              )}
                              <span className={cn('truncate flex-1', isTop ? 'font-medium' : '')}>
                                {w.title}
                              </span>
                              <button
                                type="button"
                                data-close-btn
                                title="Close"
                                aria-label="Close window"
                                className={cn(
                                  isTouch
                                    ? 'opacity-100'
                                    : 'opacity-0 group-hover/item:opacity-100 focus:opacity-100',
                                  'transition-opacity inline-flex items-center justify-center',
                                  'h-6 w-6 rounded-md border border-zinc-200 bg-white text-zinc-600',
                                  'hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                )}
                                onClick={handleWinCloseClick}
                              >
                                <XIcon className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Portal>
              )}
            </div>
          );
        })}
      </div>

      {/* Right side: Desktop toggle + Clock */}
      <div className="flex items-center gap-2 pl-2">
        <button
          type="button"
          title={isShowingDesktop ? 'Restore windows' : 'Show Desktop'}
          onClick={() => toggleShowDesktop()}
          className={cn(
            'inline-flex items-center justify-center rounded-md border border-zinc-200',
            'bg-white h-8 px-2 text-xs',
            isShowingDesktop ? 'ring-2 ring-sky-300/60' : 'hover:bg-zinc-100'
          )}
        >
          {isShowingDesktop ? (
            <>
              <MonitorUp className="h-4 w-4 mr-1" />
              Restore
            </>
          ) : (
            <>
              <MonitorDown className="h-4 w-4 mr-1" />
              Desktop
            </>
          )}
        </button>

        <div
  className="text-xs text-zinc-600 tabular-nums select-none ml-1 mr-1"
  suppressHydrationWarning
>
  {now ? (
    <>
      {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{' '}
      <span className="text-zinc-400">•</span>{' '}
      {now.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
    </>
  ) : (
    <>
      --:-- <span className="text-zinc-400">•</span> -- ---
    </>
  )}
</div>
      </div>

      {/* Context menu (shift+right-click) */}
      {ctx && (
        <div
          className="fixed z-[100000] rounded-md border border-zinc-200 bg-white shadow-lg text-sm overflow-hidden"
          style={{ left: ctx.x, top: ctx.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full text-left px-3 py-2 hover:bg-zinc-100"
            onClick={() => {
              restore(ctx.winId);
              setCtx(null);
            }}
          >
            Restore
          </button>
          <button
            className="block w-full text-left px-3 py-2 hover:bg-zinc-100"
            onClick={() => {
              minimize(ctx.winId);
              setCtx(null);
            }}
          >
            Minimize
          </button>
          <div className="h-px bg-zinc-200" />
          <button
            className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
            onClick={() => {
              close(ctx.winId);
              setCtx(null);
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
