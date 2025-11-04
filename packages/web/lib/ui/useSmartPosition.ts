'use client';

import { useEffect, useState } from 'react';

export type SmartPosition = {
  top: number;
  left: number;
  above: boolean;
};

/**
 * useSmartPosition
 * ----------------
 * Calculates and updates the viewport-clamped position of a floating panel
 * relative to a target element. Used for hover previews, tooltips, etc.
 *
 * - Supports "preferAbove" (tries above but falls back below)
 * - Clamps horizontally so panels never clip off-screen
 * - Re-measures on scroll/resize while visible
 * - Uses requestAnimationFrame for accurate first paint
 */
export function useSmartPosition(
  targetRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  visible: boolean,
  preferAbove = false,
  margin = 8
): SmartPosition {
  const [pos, setPos] = useState<SmartPosition>({
    top: 0,
    left: 0,
    above: false,
  });

  useEffect(() => {
    if (!visible || !targetRef.current || !panelRef.current) return;

    let rafId = 0;

    const measure = () => {
      const t = targetRef.current!.getBoundingClientRect();
      const panel = panelRef.current!;
      const panelH = panel.offsetHeight || 0;
      const panelW = panel.offsetWidth || 0;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Determine if we have enough space above or below
      const roomAbove = t.top - margin - panelH > margin;
      const roomBelow = t.bottom + margin + panelH < vh - margin;

      let above = false;
      if (preferAbove) {
        above = roomAbove || !roomBelow; // prefer above, fallback below
      } else {
        above = !roomBelow && roomAbove ? true : false; // prefer below normally
      }

      const top = above ? t.top - panelH - margin : t.bottom + margin;

      // Center horizontally and clamp within viewport bounds
      const center = t.left + t.width / 2 - panelW / 2;
      const left = Math.min(Math.max(center, margin), vw - panelW - margin);

      setPos({ top, left, above });
    };

    // Wait for DOM paint (prevents mismeasurement)
    rafId = window.requestAnimationFrame(measure);

    const reflow = () => measure();
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [visible, targetRef, panelRef, preferAbove, margin]);

  return pos;
}
