'use client';

import * as XLSX from 'xlsx';
import { Export } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useInventory } from '@/store/inventory';
import { useInventoryView } from '@/store/inventoryView';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type InventoryExportMenuProps = {
  buttonClassName?: string;
};

export default function InventoryExportMenu({ buttonClassName }: InventoryExportMenuProps = {}) {
  const { items } = useInventory();
  const { hiddenCols } = useInventoryView();

  const visibleCols = ['sku', 'name', 'category', 'qty', 'updatedAt'].filter(
    (c) => !hiddenCols.includes(c),
  );

  const doExport = (type: 'csv' | 'xlsx') => {
    const data = items.map((it) => {
      const row: Record<string, unknown> = {};
      for (const col of visibleCols) {
        // @ts-expect-error index safe for known keys
        row[col] = it[col];
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const fileName = `inventory_${new Date().toISOString().split('T')[0]}`;
    if (type === 'csv') XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    else XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const triggerClass = cn(
    'inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--line))] bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/75 shadow-[0_10px_24px_hsl(var(--accent-blue)/0.05)] transition hover:text-foreground hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]',
    buttonClassName,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={triggerClass}>
          <Export size={16} weight="duotone" />
          Eksportér
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-xl">
        <DropdownMenuItem onClick={() => doExport('csv')} className="text-xs rounded-xl">
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => doExport('xlsx')} className="text-xs rounded-xl">
          Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
