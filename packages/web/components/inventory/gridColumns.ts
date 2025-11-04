// src/components/inventory/gridColumns.ts
'use client';

import { useMemo } from 'react';
import type { Item, GridCell, GridColumn } from '@glideapps/glide-data-grid';
import { GridCellKind } from '@glideapps/glide-data-grid';

import type { InventoryItem } from '@/store/inventory';
import { useCatalog } from '@/store/catalog';
import { useCatalogLink } from '@/store/catalogLink';
import type { ViewState } from '@/store/inventoryView';
import { useNetworkInventory } from '@/store/networkInventory';
import { timeSinceISO } from '@/types/product';
import { deriveSizeLabel } from '@/lib/inventoryFacets';
import type { StatusCell } from './gridStatusCell';
import { SYNC_CONFIDENCE_META, type SyncConfidence } from './gridCells';
import type { OpenActionCell, OpenActionCellData } from './openActionCell';

// Legacy "open" column replaced by dedicated action cell
export type ColId =
  | 'source'
  | 'status'
  | 'stores'
  | 'brand'
  | 'product'
  | 'size'
  | 'sku'
  | 'qty'
  | 'updatedAt'
  | 'actions';

export type InventoryGridColumn = GridColumn & { id: ColId; width?: number };

export type ColumnConfig = {
  allCols: InventoryGridColumn[];
  getCellContent: (cell: Item) => GridCell;
};

// Extract frame model from inventory item's human name: "ARTHUR 51 — Unknown" -> "ARTHUR"
function modelFromInventoryName(name?: string): string | undefined {
  if (!name) return undefined;
  // take text before first " — " and strip trailing size numbers
  const left = name.split('—')[0]?.trim() ?? name;
  // remove trailing size tokens like "51", "49", etc.
  const parts = left.split(/\s+/);
  const trimmed = parts
    .filter((p) => !/^\d{2,3}$/.test(p))
    .join(' ')
    .trim();
  return trimmed || undefined;
}

function deriveForRow(
  row: InventoryItem,
  opts: { lowThreshold: number },
  catalogGetBySku: (sku: string) => any | undefined,
) {
  const p = catalogGetBySku(row.sku);
  const normalizeSkuValue = (value?: string) => (value ? value.trim().toLowerCase() : '');
  const normalizedSku = normalizeSkuValue(row.sku);
  const productSkuMatch = normalizeSkuValue((p as any)?.sku) === normalizedSku;
  const variantSkuMatch =
    Array.isArray(p?.variants) &&
    p.variants.some((variant: any) => normalizeSkuValue(variant?.sku) === normalizedSku);
  const handleFallbackHit = Boolean(p) && !productSkuMatch && !variantSkuMatch;

  const brand = (p?.brand as string | undefined)?.trim() || undefined;

  // Prefer explicit model from our inventory name; fallback to catalog model/name
  const model =
    modelFromInventoryName(row.name) ||
    (p?.model as string | undefined)?.trim() ||
    (p?.name as string | undefined)?.trim();

  const color =
    (Array.isArray(p?.variants) && p.variants[0]?.color?.name) ||
    p?.photos?.[0]?.colorwayName ||
    // fallback: right side of "— COLOR"
    (row.name?.includes('—') ? row.name.split('—')[1]?.trim() : undefined) ||
    undefined;

  const productLabel = [model, color].filter(Boolean).join(' — ') || row.name;

  // Prefer live link state for the sync badge (verified/manual/unlinked)
  const link = useCatalogLink.getState().getLink(row.id);
  let conf: SyncConfidence | undefined;
  if (!link) conf = 'unlinked';
  else if (link.variantSku) conf = 'verified';
  else conf = 'manual';
  // Fallback to catalog confidence if link is missing and catalog provides one
  if (
    !link &&
    p?.source?.confidence &&
    ['verified', 'manual', 'unlinked'].includes(p.source.confidence)
  ) {
    conf = p.source.confidence as SyncConfidence;
  }
  if (!link && handleFallbackHit) {
    conf = 'manual';
  }
  const syncLabel = conf ? SYNC_CONFIDENCE_META[conf]?.label : undefined;

  const thumbUrl = p?.photos?.find((ph: any) => ph.isHero)?.url || p?.photos?.[0]?.url || undefined;

  const qty = row.qty;
  const status = qty === 0 ? 'OUT' : qty <= opts.lowThreshold ? 'LOW' : 'IN';

  return { brand, productLabel, syncConfidence: conf, syncLabel, status, thumbUrl };
}

type RowWithSource = InventoryItem & {
  source?: 'Store' | 'Network' | 'Catalog';
  sourceLabel?: string;
};

const SOURCE_LABELS: Record<'Store' | 'Network' | 'Catalog', string> = {
  Store: 'Butik',
  Network: 'Kæde',
  Catalog: 'Katalog',
};

export function useInventoryGridColumns(
  rows: RowWithSource[],
  view: Pick<ViewState, 'stock' | 'sort' | 'sourceMode'>,
) {
  const { getBySku } = useCatalog();
  const getNetworkBySku = useNetworkInventory((s) => s.getBySku);

  const allCols: InventoryGridColumn[] = useMemo(
    () => [
      { id: 'source', title: 'Kilde', width: 104 },
      { id: 'status', title: 'Status', width: 92 },
      { id: 'stores', title: 'Butikker', width: 92 },
      { id: 'brand', title: 'Brand', width: 120 },
      { id: 'product', title: 'Produkt', width: 380 },
      { id: 'size', title: 'Str.', width: 84 },
      { id: 'sku', title: 'SKU', width: 200 },
      { id: 'qty', title: 'Antal', width: 88 },
      { id: 'updatedAt', title: 'Opdateret', width: 140 },
      { id: 'actions', title: '', width: 56 },
    ],
    [],
  );

  const getCellContent = (cell: Item): GridCell => {
    const [colIdx, rowIdx] = cell;
    const row = rows[rowIdx];
    const col = allCols[colIdx];
    if (!row || !col) {
      return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false };
    }

    switch (col.id) {
      case 'source': {
        const role = row.source ?? 'Store';
        const label = row.sourceLabel ?? SOURCE_LABELS[role] ?? role;
        return {
          kind: GridCellKind.Custom,
          allowOverlay: false,
          copyData: label,
          data: {
            kind: 'sourceBadge',
            role,
            label,
          },
        } as GridCell;
      }
      case 'status': {
        const { status } = deriveForRow(row, { lowThreshold: view.stock.lowThreshold }, (sku) =>
          getBySku(sku),
        );
        const source = (row as any).source as 'Store' | 'Network' | 'Catalog' | undefined;
        return {
          kind: GridCellKind.Custom,
          allowOverlay: false,
          data: {
            kind: 'statusCell',
            status,
            source,
          },
        } as StatusCell;
      }

      case 'stores': {
        const source = (row as any).source;
        if (source === 'Network' || (view.sourceMode === 'all' && source === 'Network')) {
          const partners = getNetworkBySku(row.sku);
          const count = partners?.filter((p) => p.qty > 0).length ?? 0;
          return {
            kind: GridCellKind.Number,
            data: count,
            displayData: String(count),
            allowOverlay: false,
          };
        }

        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false };
      }

      case 'brand': {
        const { brand } = deriveForRow(row, { lowThreshold: view.stock.lowThreshold }, (sku) =>
          getBySku(sku),
        );
        const b = brand ?? '—';
        return { kind: GridCellKind.Text, data: b, displayData: b, allowOverlay: false };
      }

      case 'product': {
        const { productLabel, syncConfidence, syncLabel, thumbUrl } = deriveForRow(
          row,
          { lowThreshold: view.stock.lowThreshold },
          (sku) => getBySku(sku),
        );
        return {
          kind: GridCellKind.Custom,
          allowOverlay: false,
          data: {
            kind: 'productCell',
            label: productLabel,
            thumbUrl,
            syncConfidence,
            syncLabel,
          },
        } as any;
      }

      case 'size': {
        const source = (row as any).source as 'Store' | 'Network' | 'Catalog' | undefined;
        const resolved =
          source === 'Catalog'
            ? (row.sizeLabel && String(row.sizeLabel).trim()) || '—'
            : deriveSizeLabel(row);
        const display = resolved && resolved.trim().length > 0 ? resolved : '—';
        return {
          kind: GridCellKind.Text,
          data: display,
          displayData: display,
          allowOverlay: false,
        };
      }

      case 'sku':
        return {
          kind: GridCellKind.Text,
          data: row.sku,
          displayData: row.sku,
          allowOverlay: false,
        };

      case 'qty':
        return {
          kind: GridCellKind.Number,
          data: row.qty,
          displayData: String(row.qty),
          allowOverlay: true,
        };

      case 'updatedAt': {
        const rel = timeSinceISO(row.updatedAt);
        return { kind: GridCellKind.Text, data: rel, displayData: rel, allowOverlay: false };
      }

      case 'actions': {
        const source = (row as any).source as 'Store' | 'Network' | 'Catalog' | undefined;
        const role: OpenActionCellData['role'] =
          !source || source === 'Store' ? 'store' : source === 'Network' ? 'network' : 'catalog';
        const href =
          role === 'catalog' ? ((row as any).catalogUrl as string | undefined) : undefined;
        const cell: OpenActionCell = {
          kind: GridCellKind.Custom,
          allowOverlay: false,
          copyData: href ?? '',
          data: {
            kind: 'openAction',
            role,
            href,
          },
        };
        return cell;
      }

      default:
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false };
    }
  };

  return { allCols, getCellContent };
}
