// src/components/scan/scanUi.ts
let injected = false;

export function ensureScanKeyframes() {
  if (injected) return;
  if (typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.innerHTML = `
@keyframes blue-breathe {
  0%   { box-shadow: 0 0 0 0 rgba(34,139,230,.22), inset 0 0 0 2px rgba(255,255,255,.35); }
  50%  { box-shadow: 0 0 0 8px rgba(34,139,230,.10), inset 0 0 0 2px rgba(255,255,255,.35); }
  100% { box-shadow: 0 0 0 0 rgba(34,139,230,.22), inset 0 0 0 2px rgba(255,255,255,.35); }
}
@keyframes sweep {
  0%   { transform: translateY(-12%); opacity: 0; }
  10%  { opacity: .25; }
  50%  { opacity: .36; }
  100% { transform: translateY(112%); opacity: 0; }
}
@keyframes ring-ripple {
  0%   { transform: scale(.985); opacity: .14; }
  60%  { transform: scale(1.03); opacity: .35; }
  100% { transform: scale(1.06); opacity: 0; }
}
@keyframes check-draw {
  0% { stroke-dasharray: 0 34; }
  100% { stroke-dasharray: 34 34; }
}
@keyframes success-flash {
  0%   { opacity: 0; }
  10%  { opacity: .85; }
  60%  { opacity: .35; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
  }
}
`;
  document.head.appendChild(s);
  injected = true;
}

export function ringClass(success: boolean) {
  return success
    ? 'ring-2 ring-emerald-500'
    : 'ring-[2px] ring-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue)/.05)]';
}

export function roiClass(success: boolean) {
  return success
    ? 'ring-2 ring-emerald-500 bg-emerald-400/10'
    : 'ring-[2px] ring-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue)/.10)]';
}

export function successFlash(container: HTMLElement, radiusPx = 16) {
  try {
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.inset = '0';
    flash.style.pointerEvents = 'none';
    flash.style.background = 'hsl(var(--accent-blue))';
    flash.style.opacity = '0';
    flash.style.borderRadius = `${radiusPx}px`;
    flash.style.animation = 'success-flash 600ms ease-out forwards';
    container.appendChild(flash);
    setTimeout(() => {
      try {
        container.removeChild(flash);
      } catch {}
    }, 800);
  } catch {}
}
