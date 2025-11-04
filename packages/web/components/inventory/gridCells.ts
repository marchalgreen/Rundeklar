'use client';

import type { CustomCell, CustomRenderer, Theme } from '@glideapps/glide-data-grid';
import { GridCellKind } from '@glideapps/glide-data-grid';

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(url: string): HTMLImageElement {
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return img;
}

type Palette = {
  fill: string;
  stroke: string;
  text: string;
};

function getCssVarValue(variable: `--${string}`): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return raw || undefined;
}

function resolvePalette(
  toneVar: `--${string}`,
  theme: Theme,
  cache: Map<string, Palette>,
  cacheKey: string,
): Palette {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tone = getCssVarValue(toneVar);

  if (!tone) {
    const fallback: Palette = {
      fill: theme.bgCell,
      stroke: theme.textLight,
      text: theme.textDark,
    };
    cache.set(cacheKey, fallback);
    return fallback;
  }

  const palette: Palette = {
    fill: `hsl(${tone} / 0.18)`,
    stroke: `hsl(${tone} / 0.32)`,
    text: `hsl(${tone})`,
  };
  cache.set(cacheKey, palette);
  return palette;
}

export type SyncConfidence = 'verified' | 'manual' | 'unlinked';

type SyncMeta = {
  icon: '✓' | '〰' | '⚠';
  label: 'Bekræftet' | 'Manuel' | 'Ikke linket';
  toneVar: `--${string}`;
};

const syncPaletteCache = new Map<SyncConfidence, Palette>();

export const SYNC_CONFIDENCE_META: Record<SyncConfidence, SyncMeta> = {
  verified: { icon: '✓', label: 'Bekræftet', toneVar: '--svc-check' },
  manual: { icon: '〰', label: 'Manuel', toneVar: '--svc-pickup' },
  unlinked: { icon: '⚠', label: 'Ikke linket', toneVar: '--svc-repair' },
};

const DEFAULT_FONT_SIZE = 12;
const BADGE_FONT_SIZE = 10;

export const PRODUCT_CELL_LAYOUT = {
  paddingX: 8,
  paddingY: 6,
  thumbSize: 22,
  thumbGap: 8,
  badgeSize: 16,
  badgeGap: 6,
} as const;

/** Data payload for our custom Produkt cell */
export type ProductCellData = {
  kind: 'productCell';
  /** main text, e.g., "ARTHUR — BLACK" */
  label: string;
  /** 16–24px preview; can be data URL or remote; optional */
  thumbUrl?: string;
  /** sync confidence badge */
  syncConfidence?: SyncConfidence;
  /** precomputed tooltip label */
  syncLabel?: string;
};

/** Full custom cell type for Glide */
export type ProductCell = CustomCell<ProductCellData>;

/**
 * A compact, fast canvas renderer for the Produkt column.
 * Renders:
 *  - 22px rounded thumbnail (if available)
 *  - label text (ellipsized)
 *  - tiny sync badge on the right
 */
export const productCellRenderer: CustomRenderer<ProductCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is ProductCell =>
    c.kind === GridCellKind.Custom && (c.data as any)?.kind === 'productCell',

  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const data = cell.data as ProductCellData;

    const padX = PRODUCT_CELL_LAYOUT.paddingX;
    const padY = PRODUCT_CELL_LAYOUT.paddingY;

    // background handled by grid; we only draw content
    let x = rect.x + padX;
    const y = rect.y + padY;

    // Thumbnail
    const size = PRODUCT_CELL_LAYOUT.thumbSize;
    if (data.thumbUrl) {
      const img = getCachedImage(data.thumbUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      try {
        ctx.drawImage(img, x, y, size, size);
      } catch {
        // ignore draw errors if image isn't ready yet
      }
      ctx.restore();
      x += size + PRODUCT_CELL_LAYOUT.thumbGap; // gap after thumb
    }

    // Text
    ctx.fillStyle = theme.textDark;
    ctx.font = `${DEFAULT_FONT_SIZE}px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';

    const hasBadge = !!data.syncConfidence;
    const badgeSpace = hasBadge
      ? PRODUCT_CELL_LAYOUT.badgeSize + PRODUCT_CELL_LAYOUT.badgeGap
      : 0;
    const labelWidth =
      rect.width - (x - rect.x) - PRODUCT_CELL_LAYOUT.paddingX - badgeSpace;
    const text = data.label ?? '';
    let out = text;

    // simple ellipsis
    while (out.length > 3 && ctx.measureText(out).width > labelWidth) {
      out = out.slice(0, -1);
    }
    if (out !== text) out += '…';

    ctx.fillText(out, x, rect.y + rect.height / 2);

    if (data.syncConfidence) {
      const meta = SYNC_CONFIDENCE_META[data.syncConfidence];
      const palette = resolvePalette(
        meta.toneVar,
        theme,
        syncPaletteCache,
        data.syncConfidence,
      );

      const badgeSize = PRODUCT_CELL_LAYOUT.badgeSize;
      const radius = badgeSize / 2;
      const badgeCenterX = rect.x + rect.width - PRODUCT_CELL_LAYOUT.paddingX - radius;
      const badgeCenterY = rect.y + rect.height / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(badgeCenterX, badgeCenterY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.lineWidth = 1;
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.strokeStyle = palette.stroke;
      ctx.stroke();

      ctx.fillStyle = palette.text;
      ctx.font = `${BADGE_FONT_SIZE}px ${theme.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.icon, badgeCenterX, badgeCenterY + 0.5);
      ctx.restore();
    }

    return true;
  },

  // not editable here
  provideEditor: () => undefined,
};
