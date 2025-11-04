'use client';

import type { CustomCell, CustomRenderer, Theme } from '@glideapps/glide-data-grid';
import { GridCellKind } from '@glideapps/glide-data-grid';

export type StockStatus = 'IN' | 'LOW' | 'OUT';

export type StatusCellData = {
  kind: 'statusCell';
  status: StockStatus;
  source?: 'Store' | 'Network' | 'Catalog';
};

export type StatusCell = CustomCell<StatusCellData>;

type StatusKey = StatusCellData['status'];

type StatusMeta = {
  label: string;
  toneVar: `--${string}`;
};

const STATUS_META: Record<StatusKey, StatusMeta> = {
  IN: { label: 'På lager', toneVar: '--svc-check' },
  LOW: { label: 'Lav', toneVar: '--svc-pickup' },
  OUT: { label: 'Udsolgt', toneVar: '--svc-repair' },
};

type Palette = {
  fill: string;
  stroke: string;
  text: string;
};

const paletteCache = new Map<StatusKey, Palette>();

function getCssVarValue(variable: `--${string}`): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return raw || undefined;
}

function resolvePalette(status: StatusKey, theme: Theme): Palette {
  const cached = paletteCache.get(status);
  if (cached) return cached;

  const meta = STATUS_META[status];
  const tone = getCssVarValue(meta.toneVar);

  if (!tone) {
    const fallback: Palette = {
      fill: theme.bgCell,
      stroke: theme.textLight,
      text: theme.textDark,
    };
    paletteCache.set(status, fallback);
    return fallback;
  }

  let fillAlpha = 0.18;
  let strokeAlpha = 0.32;
  let textColor = `hsl(${tone})`;

  if (status === 'LOW') {
    fillAlpha = 0.22;
    strokeAlpha = 0.36;
    textColor = 'hsl(28 92% 32%)';
  } else if (status === 'OUT') {
    strokeAlpha = 0.34;
  }

  const palette: Palette = {
    fill: `hsl(${tone} / ${fillAlpha})`,
    stroke: `hsl(${tone} / ${strokeAlpha})`,
    text: textColor,
  };
  paletteCache.set(status, palette);
  return palette;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const statusCellRenderer: CustomRenderer<StatusCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is StatusCell =>
    cell.kind === GridCellKind.Custom && (cell.data as StatusCellData | undefined)?.kind === 'statusCell',
  draw: ({ ctx, rect, theme }, cell) => {
    const data = cell.data as StatusCellData;
    if (data.source === 'Catalog') {
      const text = 'Katalog';
      ctx.font = `12px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';

      const paddingX = 10;
      const pillHeight = 22;
      const textWidth = ctx.measureText(text).width;
      const availableWidth = Math.max(rect.width - 12, pillHeight);
      const pillWidth = Math.min(availableWidth, textWidth + paddingX * 2);
      const pillX = rect.x + (rect.width - pillWidth) / 2;
      const pillY = rect.y + (rect.height - pillHeight) / 2;

      ctx.lineWidth = 1;
      ctx.fillStyle = theme.bgCell;
      roundRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();

      ctx.strokeStyle = theme.textLight;
      ctx.stroke();

      ctx.fillStyle = theme.textMedium;
      ctx.fillText(text, pillX + paddingX, rect.y + rect.height / 2);

      return true;
    }

    const meta = STATUS_META[data.status];
    if (!meta) return false;

    const palette = resolvePalette(data.status, theme);

    const text = meta.label;

    ctx.font = `12px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(text).width;
    const paddingX = 12;
    const pillHeight = 22;
    const availableWidth = Math.max(rect.width - 12, pillHeight);
    const pillWidth = Math.min(availableWidth, textWidth + paddingX * 2);
    const pillX = rect.x + (rect.width - pillWidth) / 2;
    const pillY = rect.y + (rect.height - pillHeight) / 2;

    ctx.lineWidth = 1;
    ctx.fillStyle = palette.fill;
    roundRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();

    ctx.strokeStyle = palette.stroke;
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.fillText(text, pillX + paddingX, rect.y + rect.height / 2);

    return true;
  },
  provideEditor: () => undefined,
};
