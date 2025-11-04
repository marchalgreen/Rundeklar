// src/components/inventory/sourceBadgeCell.ts
import type { CustomCell, CustomRenderer } from '@glideapps/glide-data-grid';
import { GridCellKind } from '@glideapps/glide-data-grid';

export type SourceBadgeCellData = {
  kind: 'sourceBadge';
  role: 'Store' | 'Network' | 'Catalog';
  label: string;
};
export type SourceBadgeCell = CustomCell<SourceBadgeCellData>;

function getTokenHsl(varName: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return v?.trim().length ? `hsl(${v.trim()})` : fallback;
}

export const sourceBadgeCellRenderer: CustomRenderer<SourceBadgeCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is SourceBadgeCell =>
    c.kind === GridCellKind.Custom && (c.data as any)?.kind === 'sourceBadge',
  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const data = cell.data as SourceBadgeCellData;
    const { x, y, width, height } = rect;

    // Map source → color token
    const color =
      data.role === 'Store'
        ? getTokenHsl('--source-store', '211 100% 50%')      // blue/purple fallback
        : data.role === 'Network'
          ? getTokenHsl('--source-network', '181 80% 44%')  // turquoise fallback
          : getTokenHsl('--source-catalog', '38 100% 65%'); // amber fallback

    const pillH = Math.min(22, height - 6);
    const padX = 10;
    ctx.save();
    ctx.font = `12px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(data.label).width;
    const pillW = Math.min(width - 8, textW + padX * 2);
    const px = x + (width - pillW) / 2;
    const py = y + (height - pillH) / 2;
    const r = pillH / 2;

    // filled pill
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + pillW - r, py);
    ctx.arc(px + pillW - r, py + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(px + r, py + pillH);
    ctx.arc(px + r, py + r, r, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.closePath();
    ctx.fill();

    // text
    ctx.fillStyle = '#fff';
    ctx.fillText(data.label, px + padX, y + height / 2);
    ctx.restore();
    return true;
  },
  provideEditor: () => undefined,
};

export default sourceBadgeCellRenderer;
