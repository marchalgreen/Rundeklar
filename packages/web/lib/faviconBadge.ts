// src/lib/faviconBadge.ts
export type BadgeOptions = {
  baseIcon?: string; // default '/favicon.svg'
  count?: number; // 0 = clear; >0 = number; -1 with dot=true = red dot
  dot?: boolean;
  bg?: string; // badge background
  fg?: string; // badge text color
  scale?: number; // canvas scale (crispness)
};

// App Badging API typings (Chromium)
type BadgingNavigator = Navigator & {
  setAppBadge?: Navigator['setAppBadge'];
  clearAppBadge?: Navigator['clearAppBadge'];
};

let cachedBase: HTMLImageElement | null = null;

function replaceAllFaviconLinks(): HTMLLinkElement {
  // Remove all existing favicons (icon, shortcut icon, apple-touch-icon)
  document
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((n) => n.parentElement?.removeChild(n));

  // Create one canonical favicon link we control
  const link = document.createElement('link');
  link.id = 'dynamic-favicon';
  link.rel = 'icon';
  link.sizes = 'any';
  document.head.appendChild(link);
  return link;
}

async function loadBase(src: string): Promise<HTMLImageElement> {
  if (cachedBase && cachedBase.src.endsWith(src)) return cachedBase;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = src;
  await img.decode().catch(() => {});
  cachedBase = img;
  return img;
}

export async function setFaviconBadge(opts: BadgeOptions = {}) {
  const {
    baseIcon = '/favicon.svg',
    count = 0,
    dot = false,
    bg = '#ef4444',
    fg = '#ffffff',
    scale = 1,
  } = opts;

  // Progressive: App Badging API (Chromium)
  const nav = navigator as BadgingNavigator;
  if (typeof nav.setAppBadge === 'function' || typeof nav.clearAppBadge === 'function') {
    try {
      if (count > 0 && !dot && typeof nav.setAppBadge === 'function') {
        nav.setAppBadge(Math.min(999, count));
      } else if ((count > 0 || dot) && typeof nav.setAppBadge === 'function') {
        nav.setAppBadge();
      } else if (typeof nav.clearAppBadge === 'function') {
        nav.clearAppBadge();
      }
    } catch {
      // ignore unsupported or transient errors
    }
  }

  const link = replaceAllFaviconLinks();

  // No badge → restore base icon
  if (count <= 0 && !dot) {
    link.type = baseIcon.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    link.href = `${baseIcon}?v=base`;
    return;
  }

  const img = await loadBase(baseIcon);
  const size = 64 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback: if we cannot draw, just restore the base icon
    link.type = baseIcon.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    link.href = `${baseIcon}?v=fallback`;
    return;
  }
  ctx.clearRect(0, 0, size, size);

  // Draw base icon
  ctx.drawImage(img, 0, 0, size, size);

  // Badge geometry (top-right)
  const r = Math.round(size * 0.22);
  const cx = Math.round(size * 0.78);
  const cy = Math.round(size * 0.22);

  // Badge background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();

  if (!dot && count > 0) {
    const label = count > 99 ? '99+' : String(count);
    ctx.fillStyle = fg;
    ctx.font = `${Math.round(r * 1.2)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(0, Math.round(r * 0.05));
    ctx.fillText(label, cx, cy);
    ctx.restore();
  }

  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
}
