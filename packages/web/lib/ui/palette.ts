// src/lib/ui/palette.ts
'use client';

/** Read a CSS variable (e.g. '--svc-check') and return a CSS color string like 'hsl(...)'. */
export function hslVar(name: `--${string}`, alpha?: number): string {
  const raw =
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : '';
  const base = raw ? `hsl(${raw})` : 'transparent';
  if (alpha == null) return base;
  // raw may already include alpha via '/ x', so we fallback to color-mix for safety
  return `color-mix(in oklab, ${base} ${Math.max(0, Math.min(100, alpha * 100))}%, transparent)`;
}

export const TOKENS = {
  ok: '--svc-check' as const,
  warn: '--svc-pickup' as const,
  danger: '--svc-repair' as const,
  line: '--line' as const,
  accentBlue: '--accent-blue' as const,
};
