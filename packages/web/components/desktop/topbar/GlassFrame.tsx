'use client';

import { cn } from '@/lib/utils/cn';

const NOISE_BG =
  "url(\"data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>\
<filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='3' type='fractalNoise'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 .25 0'/></feComponentTransfer></filter>\
<rect width='100%' height='100%' filter='url(%23n)'/>\
</svg>\")";

export default function GlassFrame({
  className,
  tintHsl,
  compact,
  perfDrag,
}: {
  className?: string;
  tintHsl?: string | null;
  compact: boolean;
  perfDrag: boolean;
}) {
  const base = `linear-gradient(to bottom, rgba(255,255,255,${
    compact ? '.88' : '.92'
  }), rgba(255,255,255,${compact ? '.68' : '.74'}))`;
  const tint =
    tintHsl && tintHsl.length
      ? `, radial-gradient(120% 140% at 50% -10%, hsla(${tintHsl} / ${
          compact ? 0.28 : 0.36
        }), rgba(255,255,255,0) 55%)`
      : '';

  return (
    <div className={cn('absolute inset-0 overflow-hidden rounded-[14px]', className)}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: base + tint,
          backdropFilter: `blur(${perfDrag ? 14 : 28}px)`,
          WebkitBackdropFilter: `blur(${perfDrag ? 14 : 28}px)`,
          transition: 'backdrop-filter 160ms ease, -webkit-backdrop-filter 160ms ease',
        }}
      />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,.7),inset_0_-1px_0_rgba(0,0,0,.06)]" />
      <div
        className="pointer-events-none absolute inset-0 ring-1"
        style={{
          boxShadow: tintHsl ? `0 4px 24px hsla(${tintHsl} / .08)` : '0 4px 24px rgba(0,0,0,.04)',
          borderColor: 'rgba(255,255,255,.55)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(255,255,255,.9),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[.12] mix-blend-soft-light"
        style={{ backgroundImage: NOISE_BG, backgroundSize: 'auto' }}
      />
    </div>
  );
}
