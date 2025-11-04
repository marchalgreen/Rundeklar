'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  dateISO: string; // the day being shown (midnight ISO)
  dayStart: number; // e.g. 8
  dayEnd: number; // e.g. 18
  pxPerMin: number; // pixels per minute (e.g. 2 -> 15m = 30px)
};

/**
 * Red "now" marker aligned with the grid.
 * Renders only when `dateISO` is today (local), and only between dayStart..dayEnd.
 */
export default function NowLine({ dateISO, dayStart, dayEnd, pxPerMin }: Props) {
  const [now, setNow] = useState(() => new Date());
  const rafRef = useRef<number | null>(null);
  const tRef = useRef<number | null>(null);

  // Is the displayed day == today (local)?
  const isSameLocalDate = useMemo(() => {
    const d = new Date(dateISO);
    const n = now;
    return (
      d.getFullYear() === n.getFullYear() &&
      d.getMonth() === n.getMonth() &&
      d.getDate() === n.getDate()
    );
  }, [dateISO, now]);

  // Compute vertical position (in px) from dayStart.
  const metrics = useMemo(() => {
    // base at local dayStart on the shown date
    const base = new Date(dateISO);
    base.setHours(dayStart, 0, 0, 0);
    const end = new Date(dateISO);
    end.setHours(dayEnd, 0, 0, 0);

    const totalMin = (dayEnd - dayStart) * 60;

    // If not today, or outside window, we’ll hide.
    if (!isSameLocalDate || now < base || now > end) {
      return { visible: false, top: 0, totalMin };
    }

    const diffMin = (now.getTime() - base.getTime()) / 60000;
    const clampedMin = Math.max(0, Math.min(diffMin, totalMin));
    const top = clampedMin * pxPerMin;

    return { visible: true, top, totalMin };
  }, [dateISO, dayStart, dayEnd, pxPerMin, isSameLocalDate, now]);

  // Update clock: small interval + single rAF to keep in sync with real time
  useEffect(() => {
    // tick every 15s is plenty; we also schedule a minute-boundary align.
    const tick = () => setNow(new Date());

    // next minute boundary to align the marker precisely when minutes roll
    const msToNextSecond = 1000 - (Date.now() % 1000);
    const armMinuteBoundary = () => {
      // schedule a rAF right after the next second so CSS transforms stay crisp
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setNow(new Date()));
    };

    // periodic timer
    tRef.current = window.setInterval(tick, 15000);

    // first alignment near next second to avoid visible drift
    const alignTimer = window.setTimeout(armMinuteBoundary, msToNextSecond);

    return () => {
      if (tRef.current) window.clearInterval(tRef.current);
      window.clearTimeout(alignTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!metrics.visible) return null;

  // Visuals:
  // - thin red line across the column area
  // - small red dot at the left edge (inside the 1fr pane;
  //   your gutter is a separate grid col so this aligns with the first column)
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 -translate-y-0.5"
      style={{ top: metrics.top }}
      aria-hidden
    >
      <div className="relative">
        {/* full-width hairline */}
        <div className="w-full border-t border-red-500/80" />
        {/* dot on the left edge of the column area */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}
