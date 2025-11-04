'use client';

/**
 * Shared "work area" for windows: below the header (TopBar) and above the taskbar.
 * Everyone (Window + GlobalHotkeys) should use this so snapping/maximize are consistent.
 */

export const PAD = 8;
export const TASKBAR_H = 42;

/** Find the header to measure its height. */
function getHeaderEl(): HTMLElement | null {
  return typeof document !== 'undefined'
    ? (document.querySelector('[data-topbar]') as HTMLElement | null)
    : null;
}

export type WorkArea = { x: number; y: number; w: number; h: number; vw: number; vh: number };

export function computeWorkArea(): WorkArea {
  if (typeof window === 'undefined') {
    const vw = 1000;
    const vh = 800;
    const headerBottom = 64; // SSR fallback
    const y = Math.round(Math.max(0, headerBottom) + PAD);
    return {
      x: PAD,
      y,
      w: vw - PAD * 2,
      h: Math.max(120, vh - y - PAD - TASKBAR_H),
      vw,
      vh,
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const headerRect = getHeaderEl()?.getBoundingClientRect();
  // If header is slid offscreen (translateY), bottom may be <= 0 — clamp to 0
  const headerBottom = Math.max(0, headerRect?.bottom ?? 0);
  const y = Math.round(headerBottom + PAD);

  return {
    x: PAD,
    y,
    w: vw - PAD * 2,
    h: Math.max(120, vh - y - PAD - TASKBAR_H),
    vw,
    vh,
  };
}

/**
 * Observe changes to the work area. Calls `cb(nextArea)` when it changes.
 * Returns an unsubscribe function.
 */
export function observeWorkArea(cb: (wa: WorkArea) => void): () => void {
  let raf: number | null = null;

  const tick = () => {
    if (raf != null) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => cb(computeWorkArea()));
  };

  const onResize = () => tick();
  window.addEventListener('resize', onResize, { passive: true });

  // Also watch the header resizing (e.g., density changes, show/hide, etc.)
  const header = getHeaderEl();
  let ro: ResizeObserver | null = null;
  if (header && 'ResizeObserver' in window) {
    ro = new ResizeObserver(tick);
    ro.observe(header);
  }

  // initial
  tick();

  return () => {
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    if (raf != null) cancelAnimationFrame(raf);
  };
}
