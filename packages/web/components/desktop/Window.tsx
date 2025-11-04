'use client';

import { Rnd } from 'react-rnd';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { useDesktop, WinState } from '@/store/desktop';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';
import { computeWorkArea, observeWorkArea, PAD, TASKBAR_H } from '@/lib/workArea';
import { toast } from 'sonner';

// Type badge icons
import {
  BookOpen,
  CalendarDays,
  Package as PackageIcon,
  Keyboard,
  Search,
  NotebookPen,
  UserCircle2,
} from 'lucide-react';

type Zone = null | 'max' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br';

const EDGE_BAND = 16;
const SIZE_DUR = 200;
const SIZE_EASE = 'cubic-bezier(.2,.8,.2,1)';
const MINIMIZE_DUR = 240;
const MINIMIZE_EASE = 'cubic-bezier(.2,.8,.2,1)';

/* -------------------------------- Icons / colours ------------------------------- */
const TYPE_COLORS: Record<string, string> = {
  logbook: '#7c3aed',
  booking_calendar: '#0ea5e9',
  inventory: '#f59e0b',
  hotkeys_help: '#64748b',
  hotkeys: '#64748b',
  kundekort_search: '#10b981',
};

function TypeIcon({ type, size = 12 }: { type: string; size?: number }) {
  const common = { size, strokeWidth: 2 };
  switch (type) {
    case 'logbook':
      return <BookOpen {...common} />;
    case 'booking_calendar':
      return <CalendarDays {...common} />;
    case 'inventory':
      return <PackageIcon {...common} />;
    case 'hotkeys':
    case 'hotkeys_help':
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
}
function typeShortLabel(t: string) {
  if (t === 'customer' || t === 'customerForm') return 'KK';
  if (t === 'synsJournal') return 'SJ';
  if (t === 'logbook') return 'LB';
  if (t === 'inventory') return 'VAR';
  if (t === 'booking_calendar') return 'CAL';
  if (t === 'hotkeys' || t === 'hotkeys_help') return 'HK';
  if (t === 'kundekort_search') return 'SRCH';
  return '';
}

/* ---------- helpers ---------- */
const clampRect = (
  desk: ReturnType<typeof computeWorkArea>,
  r: { x: number; y: number; w: number; h: number }
) => {
  const minW = 160,
    minH = 120;
  const w = Math.max(minW, Math.min(r.w, desk.w));
  const h = Math.max(minH, Math.min(r.h, desk.h));
  const minX = desk.x,
    minY = desk.y;
  const maxX = Math.max(minX, desk.x + desk.w - w);
  const maxY = Math.max(minY, desk.y + desk.h - h);
  return { x: Math.min(Math.max(r.x, minX), maxX), y: Math.min(Math.max(r.y, minY), maxY), w, h };
};

// Rect-based (fallback if no preview)
const zoneByRect = (
  desk: ReturnType<typeof computeWorkArea>,
  x: number,
  y: number,
  w: number,
  h: number
): Zone => {
  const leftEdge = x <= desk.x + PAD + EDGE_BAND;
  const rightEdge = desk.x + desk.w - (x + w) <= EDGE_BAND + PAD;
  const topEdge = y <= desk.y + EDGE_BAND;
  const bottomEdge = desk.y + desk.h - (y + h) <= EDGE_BAND;
  if (topEdge && !leftEdge && !rightEdge) return 'max';
  if (leftEdge && topEdge) return 'tl';
  if (rightEdge && topEdge) return 'tr';
  if (leftEdge && bottomEdge) return 'bl';
  if (rightEdge && bottomEdge) return 'br';
  if (leftEdge) return 'left';
  if (rightEdge) return 'right';
  return null;
};

// Pointer-based (driving preview)
const zoneByPointer = (desk: ReturnType<typeof computeWorkArea>, px: number, py: number): Zone => {
  const left = px <= PAD + EDGE_BAND;
  const right = desk.vw - PAD - px <= EDGE_BAND;
  const top = py <= desk.y + EDGE_BAND;
  const bottom = desk.vh - TASKBAR_H - PAD - py <= EDGE_BAND;
  if (top && !left && !right) return 'max';
  if (left && top) return 'tl';
  if (right && top) return 'tr';
  if (left && bottom) return 'bl';
  if (right && bottom) return 'br';
  if (left) return 'left';
  if (right) return 'right';
  return null;
};

const rectForZone = (desk: ReturnType<typeof computeWorkArea>, z: Zone) => {
  const halfW = Math.round(desk.w / 2);
  const halfH = Math.round(desk.h / 2);
  switch (z) {
    case 'max':
      return { x: desk.x, y: desk.y, w: desk.w, h: desk.h };
    case 'left':
      return { x: desk.x, y: desk.y, w: halfW, h: desk.h };
    case 'right':
      return { x: desk.x + halfW, y: desk.y, w: halfW, h: desk.h };
    case 'tl':
      return { x: desk.x, y: desk.y, w: halfH, h: halfH };
    case 'tr':
      return { x: desk.x + halfW, y: desk.y, w: halfW, h: halfH };
    case 'bl':
      return { x: desk.x, y: desk.y + halfH, w: halfW, h: halfH };
    case 'br':
      return { x: desk.x + halfW, y: desk.y + halfH, w: halfW, h: halfH };
    default:
      return null;
  }
};
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- size animation ---------- */
function animateSize(el: HTMLElement | null, newW: number, newH: number, dur = SIZE_DUR) {
  if (!el) return;
  const prevW = el.offsetWidth,
    prevH = el.offsetHeight;
  if (prevW === newW && prevH === newH) return;
  if (prefersReducedMotion()) return;
  const prevTransition = el.style.transition;
  el.style.transition = `width ${dur}ms ${SIZE_EASE}, height ${dur}ms ${SIZE_EASE}`;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetWidth;
  el.style.width = `${newW}px`;
  el.style.height = `${newH}px`;
  const cleanup = () => {
    el.style.transition = prevTransition || '';
    el.removeEventListener('transitionend', onEnd);
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'width' || e.propertyName === 'height') cleanup();
  };
  el.addEventListener('transitionend', onEnd);
  window.setTimeout(cleanup, dur + 60);
}

/* ---------- minimize animation ---------- */
function vrect(x: number, y: number, w: number, h: number) {
  return new DOMRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(w)),
    Math.max(1, Math.round(h))
  );
}
function makeGhost(from: DOMRect, radius = 16): HTMLDivElement {
  const g = document.createElement('div');
  Object.assign(g.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    borderRadius: `${radius}px`,
    background: 'white',
    boxShadow: '0 28px 80px rgba(0,0,0,.24), 0 8px 24px rgba(0,0,0,.14)',
    zIndex: '100000',
    transformOrigin: 'center center',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);
  document.body.appendChild(g);
  return g;
}
function nodeViewportRect(el: HTMLElement | null): DOMRect | null {
  const r = el?.getBoundingClientRect();
  if (r && r.width > 0 && r.height > 0) return r;
  return null;
}
async function animateMinimizeToTaskbar(node: HTMLElement, winId: string) {
  if (prefersReducedMotion()) return;
  const from = nodeViewportRect(node);
  if (!from) return;
  const targetEl = document.querySelector(`[data-win-id="${winId}"]`) as HTMLElement | null;
  const tr = targetEl?.getBoundingClientRect() ?? vrect(12, window.innerHeight - 34, 24, 12);
  const toCx = tr.left + tr.width / 2,
    toCy = tr.top + tr.height / 2;
  const srcCx = from.left + from.width / 2,
    srcCy = from.top + from.height / 2;
  const scaleTo = Math.max(
    0.22,
    Math.min(0.36, Math.min(tr.width / from.width, tr.height / from.height))
  );
  const dx = toCx - srcCx,
    dy = toCy - srcCy;
  const prevVis = node.style.visibility;
  node.style.visibility = 'hidden';
  const ghost = makeGhost(from, 16);
  const anim = ghost.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scaleTo})`, opacity: 0.9 },
    ],
    { duration: MINIMIZE_DUR, easing: MINIMIZE_EASE, fill: 'forwards' }
  );
  await anim.finished;
  ghost.remove();
  node.style.visibility = prevVis || '';
}

/* ---------- component ---------- */
export default function Window({ win, children }: { win: WinState; children: React.ReactNode }) {
  const { focus, close, toggleMinimize, toggleMaximize, moveResize } = useDesktop(
    useShallow((s) => ({
      focus: s.focus,
      close: s.close,
      toggleMinimize: s.toggleMinimize,
      toggleMaximize: s.toggleMaximize,
      moveResize: s.moveResize,
    }))
  );

  const isTop = useDesktop((s) => s.order[s.order.length - 1] === win.id);
  const rndRef = useRef<Rnd | null>(null);

  const [desk, setDesk] = useState(() => computeWorkArea());
  useEffect(
    () =>
      observeWorkArea((next) =>
        setDesk((prev) =>
          prev.x === next.x &&
          prev.y === next.y &&
          prev.w === next.w &&
          prev.h === next.h &&
          prev.vw === next.vw &&
          prev.vh === next.vh
            ? prev
            : next
        )
      ),
    []
  );

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: win.x, y: win.y });

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const overlayBoxRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPreviewZoneRef = useRef<Zone>(null);

  const showOverlay = useCallback(
    (r: { x: number; y: number; w: number; h: number } | null, z: Zone = null) => {
      const wrap = overlayRef.current;
      const box = overlayBoxRef.current;
      if (!wrap || !box) return;
      if (!r) {
        wrap.style.opacity = '0';
        lastPreviewZoneRef.current = null;
        return;
      }
      wrap.style.opacity = '1';
      box.style.left = r.x + 'px';
      box.style.top = r.y + 'px';
      box.style.width = r.w + 'px';
      box.style.height = r.h + 'px';
      lastPreviewZoneRef.current = z;
    },
    [overlayBoxRef, overlayRef, lastPreviewZoneRef]
  );

  const scheduleOverlayFromPointer = useCallback(
    (px: number, py: number) => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const z = zoneByPointer(desk, px, py);
        const r = z ? rectForZone(desk, z) : null;
        showOverlay(r, z ?? null);
      });
    },
    [desk, rafRef, showOverlay]
  );

  useEffect(() => {
    if (!rndRef.current) return;
    const el = rndRef.current.resizableElement.current as HTMLElement | null;

    if (win.maximized) {
      const changedW = desk.w,
        changedH = desk.h;
      rndRef.current.updatePosition({ x: desk.x, y: desk.y });
      if (el) animateSize(el, changedW, changedH);
      rndRef.current.updateSize({ width: changedW, height: changedH });
      setPos({ x: desk.x, y: desk.y });
      return;
    }

    const safe = clampRect(desk, { x: pos.x, y: pos.y, w: win.w, h: win.h });
    if (safe.x !== pos.x || safe.y !== pos.y) {
      rndRef.current.updatePosition({ x: safe.x, y: safe.y });
      setPos({ x: safe.x, y: safe.y });
      moveResize(win.id, { x: safe.x, y: safe.y });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk.x, desk.y, desk.w, desk.h, win.maximized]);

  useEffect(() => {
    if (!rndRef.current) return;
    const el = rndRef.current.resizableElement.current as HTMLElement | null;

    if (win.maximized) {
      rndRef.current.updatePosition({ x: desk.x, y: desk.y });
      if (el) animateSize(el, desk.w, desk.h);
      rndRef.current.updateSize({ width: desk.w, height: desk.h });
      setPos({ x: desk.x, y: desk.y });
    } else {
      rndRef.current.updatePosition({ x: win.x, y: win.y });
      if (el) animateSize(el, win.w, win.h);
      rndRef.current.updateSize({ width: win.w, height: win.h });
      setPos({ x: win.x, y: win.y });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.maximized]);

  const commitRect = useCallback(
    (r: { x: number; y: number; w: number; h: number }, animate = true) => {
      const safe = clampRect(desk, r);
      const el = rndRef.current?.resizableElement.current as HTMLElement | null;
      rndRef.current?.updatePosition({ x: safe.x, y: safe.y });
      if (animate && el) animateSize(el, safe.w, safe.h);
      rndRef.current?.updateSize({ width: safe.w, height: safe.h });
      setPos({ x: safe.x, y: safe.y });
      moveResize(win.id, { x: safe.x, y: safe.y, w: safe.w, h: safe.h });
    },
    [desk, moveResize, rndRef, win.id]
  );

  const getPointer = (event: DraggableEvent | undefined) => {
    if (!event) return null;
    if ('touches' in event && event.touches[0]) {
      const touch = event.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    if ('clientX' in event && 'clientY' in event) {
      return { x: event.clientX, y: event.clientY };
    }
    return null;
  };

  const handleDragStart = useCallback(() => {
    focus(win.id);
    showOverlay(null);
    lastPreviewZoneRef.current = null;
  }, [focus, showOverlay, win.id, lastPreviewZoneRef]);

  const handleDrag = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      setPos({ x: data.x, y: data.y });
      const pt = getPointer(event);
      if (pt) scheduleOverlayFromPointer(pt.x, pt.y);
      else showOverlay(null);
    },
    [scheduleOverlayFromPointer, showOverlay]
  );

  const handleDragStop = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      const previewZ = lastPreviewZoneRef.current;
      showOverlay(null);

      const el = rndRef.current?.resizableElement.current as HTMLElement | null;
      const w = el?.offsetWidth ?? win.w;
      const h = el?.offsetHeight ?? win.h;

      const z = previewZ ?? zoneByRect(desk, data.x, data.y, w, h);
      const snap = z ? rectForZone(desk, z) : null;
      const target = snap ? snap : { x: data.x, y: data.y, w, h };
      const sizeChanges = !!snap && (snap.w !== w || snap.h !== h);

      focus(win.id);
      commitRect(target, sizeChanges);
      lastPreviewZoneRef.current = null;
    },
    [commitRect, desk, focus, showOverlay, win.h, win.id, win.w, lastPreviewZoneRef]
  );

  const handleResizeStart = useCallback(() => {
    focus(win.id);
    showOverlay(null);
    lastPreviewZoneRef.current = null;
  }, [focus, showOverlay, win.id, lastPreviewZoneRef]);

  const handleResize = useCallback(
    (
      event: DraggableEvent | undefined,
      _dir: unknown,
      _ref: HTMLElement,
      _delta: { width: number; height: number },
      posNow: { x: number; y: number }
    ) => {
      setPos({ x: posNow.x, y: posNow.y });
      const pt = getPointer(event);
      if (pt) scheduleOverlayFromPointer(pt.x, pt.y);
      else showOverlay(null);
    },
    [scheduleOverlayFromPointer, showOverlay]
  );

  const handleResizeStop = useCallback(
    (
      event: DraggableEvent | undefined,
      _dir: unknown,
      ref: HTMLElement,
      _delta: { width: number; height: number },
      posNow: { x: number; y: number }
    ) => {
      const previewZ = lastPreviewZoneRef.current;
      showOverlay(null);

      const w = ref.offsetWidth;
      const h = ref.offsetHeight;

      const z = previewZ;
      const snap = z ? rectForZone(desk, z) : null;
      const target = snap ? snap : { x: posNow.x, y: posNow.y, w, h };

      commitRect(target, true);
      lastPreviewZoneRef.current = null;
    },
    [commitRect, desk, showOverlay, lastPreviewZoneRef]
  );

  const handleTitlebarClick = useCallback(() => focus(win.id), [focus, win.id]);
  const handleTitlebarDoubleClick = useCallback(
    () => toggleMaximize(win.id),
    [toggleMaximize, win.id]
  );
  const handleContentMouseDown = useCallback(() => focus(win.id), [focus, win.id]);
  const handleCloseClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      close(win.id);
    },
    [close, win.id]
  );
  const handleMaximizeClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      toggleMaximize(win.id);
    },
    [toggleMaximize, win.id]
  );
  const handleMinimize = useCallback(async () => {
    const node = rndRef.current?.resizableElement.current as HTMLElement | null;
    if (!node) {
      toggleMinimize(win.id);
      return;
    }
    await animateMinimizeToTaskbar(node, win.id);
    toggleMinimize(win.id);
  }, [rndRef, toggleMinimize, win.id]);
  const handleMinimizeClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      void handleMinimize();
    },
    [handleMinimize]
  );

  const isCustomerish =
    win.type === 'customer' || win.type === 'customerForm' || win.type === 'synsJournal';
  const hue = win.accentHue;
  const badgeStyle: CSSProperties =
    isCustomerish && typeof hue === 'number'
      ? {
          backgroundColor: `hsl(${hue} 90% 96%)`,
          borderColor: `hsl(${hue} 35% 70% / .45)`,
          color: `hsl(${hue} 35% 32% / .95)`,
        }
      : {
          backgroundColor: `${TYPE_COLORS[win.type] ?? '#e5e7eb'}1A`,
          borderColor: '#e5e7eb',
          color: TYPE_COLORS[win.type] ?? '#6b7280',
        };

  const short = typeShortLabel(win.type);

  return (
    <>
      {/* simple snap preview (no animation) */}
      <div
        ref={overlayRef}
        className="pointer-events-none fixed inset-0 z-[9998] transition-opacity duration-75"
        style={{ opacity: 0 }}
      >
        <div
          ref={overlayBoxRef}
          className="absolute rounded-2xl bg-blue-500/10 ring-2 ring-blue-400/50"
          style={{ left: 0, top: 0, width: 0, height: 0 }}
        />
      </div>

      <Rnd
        ref={rndRef}
        bounds="window"
        position={pos}
        minWidth={360}
        minHeight={240}
        dragHandleClassName="win-titlebar"
        cancel=".win-control, input, textarea, select, button, a, [role=button]"
        enableResizing={!win.maximized}
        disableDragging={!!win.maximized}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        style={{ zIndex: win.z, display: win.minimized ? 'none' : undefined }}
        className="will-change-auto"
      >
        {/* INNER FRAME — only add win-frame class for focus shadow */}
        <div
          data-win-id={win.id}
          data-active={isTop ? '1' : '0'}
          className={cn(
            'win-frame', // 👈 new hook for shadow only
            'relative h-full w-full rounded-2xl border',
            'border-border',
            isTop ? 'card-glass-active' : 'card-glass-inactive'
          )}
          style={{ transition: 'none' }}
        >
          {/* Titlebar */}
          <div
            className={cn(
              'win-titlebar cursor-move flex h-10 items-center justify-between rounded-t-2xl border-b px-3 select-none',
              isTop ? 'titlebar-active' : ''
            )}
            onClick={handleTitlebarClick}
            onDoubleClick={handleTitlebarDoubleClick}
            style={{ transition: 'none' }}
          >
            <div className="flex items-center gap-2">
              {/* CLOSE */}
              <button
                type="button"
                aria-label="Close"
                className="win-control relative inline-block h-3 w-3 rounded-full bg-[#ff5f57] after:content-[''] after:absolute after:-inset-3"
                title="Close"
                onClick={handleCloseClick}
              />
              {/* MINIMIZE */}
              <button
                type="button"
                aria-label="Minimize"
                className="win-control relative inline-block h-3 w-3 rounded-full bg-[#febc2e] after:content-[''] after:absolute after:-inset-3"
                title="Minimize"
                onClick={handleMinimizeClick}
              />
              {/* MAXIMIZE */}
              <button
                type="button"
                aria-label="Maximize / Restore"
                className="win-control relative inline-block h-3 w-3 rounded-full bg-[#28c840] after:content-[''] after:absolute after:-inset-3"
                title="Maximize / Restore"
                onClick={handleMaximizeClick}
              />
              <span className="ml-2 text-sm font-medium text-zinc-800">{win.title}</span>
            </div>

            {/* Right side: type badge */}
            <div className="flex items-center gap-2 pr-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium active:scale-[.98]"
                style={badgeStyle}
                title="Copy window ID"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText?.(win.id);
                  try {
                    navigator.clipboard?.writeText?.(win.id);
                    toast.success('Copied window ID', { description: `#${win.id}` });
                  } catch {}
                }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <TypeIcon type={win.type} size={12} />
                {short && <span>{short}</span>}
              </button>
            </div>
          </div>

          <div
            className="h-[calc(100%-40px)] overflow-auto p-3"
            onMouseDown={handleContentMouseDown}
            style={{ transition: 'none' }}
          >
            {children}
          </div>
        </div>
      </Rnd>
    </>
  );
}
