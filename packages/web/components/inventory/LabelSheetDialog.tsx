'use client';

import * as React from 'react';
import ModalShell from '@/components/inventory/ModalShell';
import { TabBar } from '@/components/inventory/TabBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import JsBarcode from 'jsbarcode';
import type { InventoryItem } from '@/store/inventory';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem | null;
  selectedItems?: InventoryItem[];
};

export default function LabelSheetDialog({ open, onOpenChange, item, selectedItems = [] }: Props) {
  const hasSelection = selectedItems.length > 0;
  const [tab, setTab] = React.useState<'single' | 'bulk'>(hasSelection ? 'bulk' : 'single');

  React.useEffect(() => {
    if (!open) return;
    setTab(hasSelection ? 'bulk' : 'single');
  }, [open, hasSelection]);

  return (
    <ModalShell open={open} onOpenChange={onOpenChange} title="Print etiketter">
      <TabBar
        tabs={[
          { key: 'single', label: 'Aktuel' },
          ...(hasSelection ? [{ key: 'bulk', label: `Udvalgte (${selectedItems.length})` }] : []),
        ]}
        active={tab}
        onChange={(id: string) => setTab(id as 'single' | 'bulk')}
      />

      {tab === 'single' ? (
        <LabelGrid key={item?.id ?? 'single'} primaryItem={item} />
      ) : (
        <BulkLabelGrid items={selectedItems} />
      )}
    </ModalShell>
  );
}

/* ---------------- Single item grid ---------------- */

function LabelGrid({ primaryItem }: { primaryItem: InventoryItem | null }) {
  const [count, setCount] = React.useState<number>(12);
  const labels = React.useMemo(() => Array.from({ length: Math.max(1, count) }), [count]);
  const refs = React.useRef<(SVGSVGElement | null)[]>([]);
  const renderKey = React.useMemo(
    () => `${primaryItem?.id ?? 'none'}-${count}`,
    [primaryItem?.id, count],
  );

  React.useEffect(() => {
    if (!primaryItem?.barcode) return;
    refs.current = refs.current.slice(0, labels.length);
    refs.current.forEach((el) => {
      if (el) {
        try {
          JsBarcode(el, primaryItem.barcode!, {
            format: 'CODE128',
            width: 2,
            height: 38,
            displayValue: true,
            fontSize: 12,
            margin: 0,
          });
        } catch {}
      }
    });
  }, [renderKey, labels, primaryItem?.barcode]);

  const onPrint = () => window.print();

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium truncate">
          {primaryItem
            ? `${primaryItem.name} (${primaryItem.sku})`
            : 'Vælg en vare for at printe etiketter.'}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="count" className="text-xs text-muted">
            Antal
          </label>
          <Input
            id="count"
            inputMode="numeric"
            value={String(count)}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
            className="w-24"
          />
          <Button onClick={onPrint} disabled={!primaryItem?.barcode}>
            Print
          </Button>
        </div>
      </div>

      <div className="bg-[hsl(var(--surface))] rounded-xl border-hair p-3 print:p-0 print:bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {labels.map((_, idx) => (
            <div
              key={idx}
              className="border-hair rounded-lg p-2 flex flex-col items-center justify-center print:border-0 print:break-inside-avoid"
            >
              <div className="text-[11px] font-medium mb-1 text-center truncate w-full">
                {primaryItem?.name ?? '—'}
              </div>
              <svg
                ref={(el) => {
                  refs.current[idx] = el;
                }}
                className="w-full"
              />
              <div className="text-[10px] mt-1 text-center text-muted">{primaryItem?.sku}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- Bulk grid ---------------- */

function BulkLabelGrid({ items }: { items: InventoryItem[] }) {
  const refs = React.useRef<Record<string, SVGSVGElement | null>>({});

  React.useEffect(() => {
    items.forEach((it) => {
      const el = refs.current[it.id];
      if (el && it.barcode) {
        try {
          JsBarcode(el, it.barcode, {
            format: 'CODE128',
            width: 2,
            height: 38,
            displayValue: true,
            fontSize: 12,
            margin: 0,
          });
        } catch {}
      }
    });
  }, [items]);

  const onPrint = () => window.print();

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <div className="text-sm font-medium">Udvalgte varer ({items.length})</div>
        <div className="ml-auto">
          <Button onClick={onPrint} disabled={items.length === 0}>
            Print
          </Button>
        </div>
      </div>

      <div className="bg-[hsl(var(--surface))] rounded-xl border-hair p-3 print:p-0 print:bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="border-hair rounded-lg p-2 flex flex-col items-center justify-center print:border-0 print:break-inside-avoid"
              title={it.name}
            >
              <div className="text-[11px] font-medium mb-1 text-center truncate w-full">
                {it.name}
              </div>
              <svg
                ref={(el) => {
                  refs.current[it.id] = el;
                }}
                className="w-full"
              />
              <div className="text-[10px] mt-1 text-center text-muted">{it.sku}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
