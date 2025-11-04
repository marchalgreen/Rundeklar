export const EASE_POP = 'cubic-bezier(.22,.7,.2,1)';
export const EASE_SOFT = 'cubic-bezier(.2,.8,.2,1)';

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
