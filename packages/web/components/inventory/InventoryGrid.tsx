'use client';

import '@glideapps/glide-data-grid/dist/index.css';
import { useMemo, useRef, useState } from 'react';
import DataEditor, {
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  GridSelection,
} from '@glideapps/glide-data-grid';
import { useInventory, type InventoryItem } from '@/store/inventory';

type Props = {
  rows: InventoryItem[];
};

export default function InventoryGrid({ rows }: Props) {
  const { adjustQty } = useInventory();
  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(undefined);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const columns: GridColumn[] = useMemo(
    () => [
      { id: 'sku', title: 'SKU', width: 160 },
      { id: 'name', title: 'Navn', width: 300 },
      { id: 'category', title: 'Kategori', width: 140 },
      { id: 'qty', title: 'Antal', width: 100 },
      { id: 'updatedAt', title: 'Opdateret', width: 180 },
    ],
    [],
  );

  const getCellContent = ([col, row]: Item): GridCell => {
    const item = rows[row];
    const key = columns[col].id as keyof InventoryItem;

    switch (key) {
      case 'sku':
      case 'name':
      case 'category':
        return {
          kind: GridCellKind.Text,
          displayData: String(item[key] ?? ''),
          data: String(item[key] ?? ''),
          allowOverlay: false,
        };
      case 'qty':
        return {
          kind: GridCellKind.Number,
          data: item.qty,
          displayData: String(item.qty),
          allowOverlay: true,
        };
      case 'updatedAt':
        return {
          kind: GridCellKind.Text,
          displayData: new Date(item.updatedAt).toLocaleString(),
          data: new Date(item.updatedAt).toLocaleString(),
          allowOverlay: false,
        };
      default:
        return { kind: GridCellKind.Text, displayData: '', data: '', allowOverlay: false };
    }
  };

  const onCellEdited = (cell: Item, newValue: GridCell) => {
    const [col, row] = cell;
    const item = rows[row];
    const key = columns[col].id;

    if (key === 'qty' && newValue.kind === GridCellKind.Number) {
      if ((item as any)?.source === 'Catalog') return;
      const next = Math.max(0, Math.round(newValue.data ?? 0));
      const delta = next - item.qty;
      if (delta !== 0) adjustQty(item.id, delta);
    }
  };

  return (
    <div ref={canvasRef} className="rounded-2xl overflow-hidden u-glass border-hair">
      <DataEditor
        columns={columns}
        getCellContent={getCellContent}
        rows={rows.length}
        onCellEdited={onCellEdited}
        gridSelection={gridSelection}
        onGridSelectionChange={setGridSelection}
        rowMarkers="both"
        smoothScrollX
        smoothScrollY
        rowHeight={36}
        headerHeight={36}
        height="50vh"
      />
    </div>
  );
}
