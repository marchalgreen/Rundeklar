'use client';

import * as XLSX from 'xlsx';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle, UploadSimple, WarningCircle } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useInventory, type InventoryItem } from '@/store/inventory';

const importSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['Frames', 'Lenses', 'Accessories']),
  qty: z.number().nonnegative(),
});

type ImportedRow = z.infer<typeof importSchema>;

type InventoryImportButtonProps = {
  variant?: 'toolbar' | 'menu';
  className?: string;
};

export default function InventoryImportButton({
  variant = 'toolbar',
  className,
}: InventoryImportButtonProps = {}) {
  const { items, setItems } = useInventory();

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
      setItems(Array.from(bySku.values()));
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle size={16} weight="fill" />
          <span>{valid.length} rækker importeret</span>
        </div>,
      );
    }

    if (invalidCount > 0) {
      toast.warning(
        <div className="flex items-center gap-2">
          <WarningCircle size={16} weight="duotone" />
          <span>{invalidCount} rækker ignoreret (ugyldige data)</span>
        </div>,
      );
    }

    e.target.value = '';
  };

  const triggerClass = cn(
    variant === 'toolbar'
      ? 'inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--line))] bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/75 shadow-[0_10px_24px_hsl(var(--accent-blue)/0.05)] transition hover:text-foreground hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]'
      : 'flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--line))] px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-[hsl(var(--accent-blue))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))] hover:bg-white',
    className,
  );

  return (
    <label className={cn('relative cursor-pointer', variant === 'menu' ? 'block w-full' : 'inline-flex')}>
      <input
        type="file"
        accept=".csv,.xlsx"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={handleImport}
      />
      <div className={triggerClass}>
        <UploadSimple size={16} weight="duotone" />
        <span>Importér</span>
      </div>
    </label>
  );
}
