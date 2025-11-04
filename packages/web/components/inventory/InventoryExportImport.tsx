'use client';

import * as XLSX from 'xlsx';
import { z } from 'zod';
import { useInventory, type InventoryItem } from '@/store/inventory';
import { useInventoryView } from '@/store/inventoryView';
import { Button } from '@/components/ui/button';
import { Upload, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const importSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['Frames', 'Lenses', 'Accessories']),
  qty: z.number().nonnegative(),
});
type ImportedRow = z.infer<typeof importSchema>;

export default function InventoryExportImport() {
  const { items, setItems } = useInventory();
  const { hiddenCols } = useInventoryView();

  const visibleCols = ['sku', 'name', 'category', 'qty', 'updatedAt'].filter(
    (c) => !hiddenCols.includes(c),
  );

  /* ---------- Export ---------- */
  const handleExport = (type: 'csv' | 'xlsx') => {
    const data = items.map((it) => {
      const row: Record<string, unknown> = {};
      visibleCols.forEach((col) => {
        // @ts-expect-error index access is safe for our known keys
        row[col] = it[col];
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const fileName = `inventory_${new Date().toISOString().split('T')[0]}`;
    if (type === 'csv') XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    else XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success(`Eksporteret ${items.length} varer som ${type.toUpperCase()}`);
  };

  /* ---------- Import ---------- */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const parsed = rows.map((r) =>
      importSchema.safeParse({
        sku: String((r as any).sku ?? (r as any).SKU ?? '').trim(),
        name: String((r as any).name ?? (r as any).Navn ?? '').trim(),
        category: String((r as any).category ?? (r as any).Kategori ?? '').trim(),
        qty: Number((r as any).qty ?? (r as any).Antal ?? 0),
      }),
    );

    const valid: ImportedRow[] = parsed
      .filter((p): p is { success: true; data: ImportedRow } => p.success)
      .map((p) => p.data);
    const invalidCount = parsed.length - valid.length;

    if (valid.length > 0) {
      // Merge into current items by SKU
      const bySku = new Map<string, InventoryItem>(items.map((i) => [i.sku, i]));
      const now = new Date().toISOString();

      for (const v of valid) {
        const existing = bySku.get(v.sku);
        if (existing) {
          bySku.set(v.sku, { ...existing, ...v, updatedAt: now });
        } else {
          bySku.set(v.sku, {
            id: crypto.randomUUID(),
            sku: v.sku,
            name: v.name,
            category: v.category,
            qty: v.qty,
            updatedAt: now,
          });
        }
      }

      const merged = Array.from(bySku.values());
      setItems(merged);

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{valid.length} rækker importeret</span>
        </div>,
      );
    }

    if (invalidCount > 0) {
      toast.warning(
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{invalidCount} rækker ignoreret (ugyldige data)</span>
        </div>,
      );
    }

    e.target.value = ''; // reset input
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs border-hair hover:u-glass"
        onClick={() => handleExport('csv')}
      >
        <Download className="h-4 w-4 mr-1" />
        Eksporter CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs border-hair hover:u-glass"
        onClick={() => handleExport('xlsx')}
      >
        <Download className="h-4 w-4 mr-1" />
        Eksporter Excel
      </Button>

      <label className="relative cursor-pointer">
        <input
          type="file"
          accept=".csv,.xlsx"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleImport}
        />
        <div className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass flex items-center gap-1">
          <Upload className="h-4 w-4" /> Importér
        </div>
      </label>
    </div>
  );
}
