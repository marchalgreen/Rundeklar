// src/components/inventory/openActionCell.ts
import type { CustomCell, CustomRenderer } from '@glideapps/glide-data-grid';
import { GridCellKind } from '@glideapps/glide-data-grid';

export type OpenActionCellData = {
  kind: 'openAction';
  role: 'store' | 'network' | 'catalog';
  href?: string;
};

export type OpenActionCell = CustomCell<OpenActionCellData>;

function drawIcon(
  ctx: CanvasRenderingContext2D,
  role: 'store' | 'network' | 'catalog',
  cx: number,
  cy: number,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (role === 'store') {
    // ↗ (arrow up-right) — indicates opening details
    ctx.save();
    ctx.scale(0.88, 0.88);
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    ctx.lineTo(3, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -4);
    ctx.lineTo(-1, -4);
    ctx.moveTo(3, -4);
    ctx.lineTo(3, 0);
    ctx.stroke();
    ctx.restore();
  } else if (role === 'network') {
    // Paper plane silhouette — send request to network
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(-1, -1);
    ctx.lineTo(4, -4);
    ctx.lineTo(0, 4);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Shopping bag: vendor/catalog context
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.rect(-4.5, -3.5, 9, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2.5, -3.5);
    ctx.quadraticCurveTo(0, -6, 2.5, -3.5);
    ctx.stroke();
  }
  ctx.restore();
}

function resolveColor(role: OpenActionCellData['role']) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const readVar = (name: string, fallback: string) =>
    root ? getComputedStyle(root).getPropertyValue(name).trim() || fallback : fallback;
  const store = `hsl(${readVar('--source-store', '211 100% 50%')})`;
  const network = `hsl(${readVar('--source-network', '181 80% 44%')})`;
  const catalog = `hsl(${readVar('--source-catalog', '38 100% 65%')})`;
  if (role === 'network') return network;
  if (role === 'catalog') return catalog;
  return store;
}

export const openActionCellRenderer: CustomRenderer<OpenActionCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is OpenActionCell =>
    c.kind === GridCellKind.Custom && (c.data as OpenActionCellData | undefined)?.kind === 'openAction',
  draw: (args, cell) => {
    const { ctx, rect } = args;
    const data = cell.data as OpenActionCellData;

    const color = resolveColor(data.role);

    const radius = 10;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawIcon(ctx, data.role, cx, cy, '#fff');
    return true;
  },
  provideEditor: () => undefined,
};

export default openActionCellRenderer;
