'use client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import InventoryImportButton from '@/components/inventory/InventoryImportButton';
import type { AdjustmentReason, InventoryItem } from '@/store/inventory';
import { usePurchaseRequests } from '@/store/purchaseRequests';
import { useDesktop } from '@/store/desktop';

type ContextMenuRow = InventoryItem & {
  source?: 'Store' | 'Network' | 'Catalog';
  sourceLabel?: string;
};

type Props = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rows: ContextMenuRow[];
  selectedItems: ContextMenuRow[];
  filter: {
    q: string;
    category: 'Alle' | 'Frames' | 'Sunglasses' | 'Lenses' | 'Accessories' | 'Contacts';
  };
  setFilter: (q: string, category: Props['filter']['category']) => void;
  adjustQty: (id: string, delta: number) => void;
  openAdjustDialog: (opts?: { reason?: AdjustmentReason; note?: string }) => void;
  setLabelsOpen: (v: boolean) => void;
  setScanOpen: (v: boolean) => void;
  exportSelectionCsv: () => void;
  exportSelectionXlsx: () => void;
  setGridSelection: (v: any) => void;
  /** Open item detail window */
  openItem: (it: ContextMenuRow) => void; // <-- ADD
};

export default function InventoryContextMenu({
  wrapperRef,
  rows,
  selectedItems,
  filter,
  setFilter,
  adjustQty,
  openAdjustDialog,
  setLabelsOpen,
  setScanOpen,
  exportSelectionCsv,
  exportSelectionXlsx,
  openItem, // <-- ADD
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rowIdx, setRowIdx] = React.useState<number | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const ensureDraft = usePurchaseRequests((s) => s.ensureDraft);
  const addLines = usePurchaseRequests((s) => s.addLines);
  const selectDraft = usePurchaseRequests((s) => s.selectDraft);
  const openWindow = useDesktop((s) => s.open);

  const openCatalogIfAvailable = React.useCallback((maybeRow: any): boolean => {
    const url: string | undefined =
      maybeRow?.catalogUrl ?? maybeRow?.sourceUrl ?? maybeRow?.source?.url;
    if (!url) return false;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }, []);

  const HEADER_H = 36;
  const ROW_H = 36;

  const computeRowIndex = React.useCallback(
    (host: HTMLElement, clientY: number): number | null => {
      const rect = host.getBoundingClientRect();
      const localY = clientY - rect.top;
      if (localY <= HEADER_H) return null;
      const idx = Math.floor((localY - HEADER_H) / ROW_H);
      if (idx < 0 || idx >= rows.length) return null;
      return idx;
    },
    [rows.length],
  );

  // Open on right-click (contextmenu) or right-button pointerdown
  React.useEffect(() => {
    const host = wrapperRef.current;
    if (!host) return;

    const onContextMenu = (e: MouseEvent) => {
      if (!host.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      setPos({ x: e.clientX, y: e.clientY });
      setRowIdx(computeRowIndex(host, e.clientY));
      setOpen(true);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!host.contains(e.target as Node)) return;
      if (e.button !== 2) return;
      e.preventDefault();
      e.stopPropagation();
      setPos({ x: e.clientX, y: e.clientY });
      setRowIdx(computeRowIndex(host, e.clientY));
      setOpen(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!host.contains(document.activeElement as Node)) return;
      if (e.shiftKey && e.key.toLowerCase() === 'f10') {
        const r = host.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top + HEADER_H + 6 });
        setRowIdx(null);
        setOpen(true);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [wrapperRef, computeRowIndex]);

  // Close on left-click outside
  React.useEffect(() => {
    if (!open) return;
    const onOutside = (e: PointerEvent) => {
      if (e.button === 2) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside, true);
    return () => document.removeEventListener('pointerdown', onOutside, true);
  }, [open]);

  // ESC closes
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  const row = rowIdx != null ? rows[rowIdx] : null;
  const hasSel = selectedItems.length > 1;
  const copy = (s?: string) => s && navigator.clipboard.writeText(s);
  const canOpenCatalog =
    row?.source === 'Catalog' &&
    !!((row as any)?.catalogUrl ?? (row as any)?.sourceUrl ?? (row as any)?.source?.url);
  const isAdjustable = !!row && row.source === 'Store';

  const addItemsToPurchaseRequest = React.useCallback(
    (items: ContextMenuRow[]) => {
      if (!items.length) return;
      const draft = ensureDraft();
      addLines(
        draft.id,
        items.map((item) => ({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          qty: 1,
          supplierHint: undefined,
        })),
      );
      selectDraft(draft.id);
      openWindow({
        type: 'purchaseRequest',
        title: 'Purchase Requests',
        payload: { id: draft.id },
      });
    },
    [ensureDraft, addLines, selectDraft, openWindow],
  );

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[9999] min-w-[192px] rounded-xl border border-hair bg-white/95 dark:bg-[hsl(var(--surface))]/95 backdrop-blur-md p-1 shadow-lg"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Row actions */}
      {row && (
        <>
          <Label className="truncate max-w-[240px]">{row.name}</Label>
          <Item
            onClick={() => {
              openItem(row);
              setOpen(false);
            }}
          >
            Åbn…
          </Item>
          {canOpenCatalog && (
            <Item
              onClick={() => {
                if (openCatalogIfAvailable(row)) setOpen(false);
              }}
            >
              Åbn i katalog
            </Item>
          )}
          <Item
            onClick={() => {
              addItemsToPurchaseRequest([row]);
              setOpen(false);
            }}
          >
            Tilføj til PR
          </Item>
          <Item
            onClick={() => {
              if (isAdjustable) openAdjustDialog({ reason: 'Correction' });
              setOpen(false);
            }}
            disabled={!isAdjustable}
          >
            Juster…
          </Item>

          <Divider />
          <Label>
            Hurtig justér
            {!isAdjustable ? (
              <span className="block text-[10px] normal-case text-muted">
                Kun tilgængelig for butiksvarelinjer
              </span>
            ) : null}
          </Label>
          <Item
            onClick={() => {
              if (isAdjustable) adjustQty(row.id, +1);
              setOpen(false);
            }}
            disabled={!isAdjustable}
          >
            +1
          </Item>
          <Item
            onClick={() => {
              if (isAdjustable) adjustQty(row.id, +5);
              setOpen(false);
            }}
            disabled={!isAdjustable}
          >
            +5
          </Item>
          <Item
            onClick={() => {
              if (isAdjustable) adjustQty(row.id, -1);
              setOpen(false);
            }}
            disabled={!isAdjustable}
          >
            -1
          </Item>

          <Divider />
          <Item
            onClick={() => {
              setLabelsOpen(true);
              setOpen(false);
            }}
          >
            Etiketter
          </Item>

          <Divider />
          <Label>Filtrér</Label>
          <Item
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('inventory:search-type', { detail: { value: row.sku } }),
              );
              setOpen(false);
            }}
          >
            Kun denne SKU
          </Item>
          <Item
            onClick={() => {
              setFilter(filter.q, row.category);
              setOpen(false);
            }}
          >
            Kategori: {row.category}
          </Item>

          <Divider />
          <Label>Kopiér</Label>
          <Item
            onClick={() => {
              copy(row.sku);
              setOpen(false);
            }}
          >
            SKU
          </Item>
          <Item
            onClick={() => {
              copy(row.name);
              setOpen(false);
            }}
          >
            Navn
          </Item>
          <Item
            disabled={!row.barcode}
            onClick={() => {
              copy(row.barcode);
              setOpen(false);
            }}
          >
            Stregkode
          </Item>
        </>
      )}

      {/* Selection actions */}
      {!row && hasSel && (
        <>
          <Label>Valgt: {selectedItems.length}</Label>
          <Item
            onClick={() => {
              exportSelectionCsv();
              setOpen(false);
            }}
          >
            Eksportér CSV
          </Item>
          <Item
            onClick={() => {
              exportSelectionXlsx();
              setOpen(false);
            }}
          >
            Eksportér Excel
          </Item>
          <Item
            onClick={() => {
              setLabelsOpen(true);
              setOpen(false);
            }}
          >
            Etiketter ({selectedItems.length})
          </Item>
          <Item
            onClick={() => {
              addItemsToPurchaseRequest(selectedItems);
              setOpen(false);
            }}
          >
            Tilføj til PR ({selectedItems.length})
          </Item>
        </>
      )}

      {/* Background actions */}
      {!row && selectedItems.length === 0 && (
        <>
          <Label>Hurtige handlinger</Label>
          <Item
            onClick={() => {
              setScanOpen(true);
              setOpen(false);
            }}
          >
            Scan stregkode…
          </Item>
          <div className="px-1 py-0.5">
            <InventoryImportButton variant="menu" />
          </div>
          <Item
            onClick={() => {
              setFilter('', 'Alle');
              setOpen(false);
            }}
          >
            Ryd filtre
          </Item>
        </>
      )}
    </div>,
    document.body,
  );
}

/* ---------- tiny styled primitives ---------- */

function Item({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={() => !disabled && onClick?.()}
      className={
        disabled
          ? 'w-full text-left text-xs px-2 py-1.5 rounded-md opacity-50 cursor-not-allowed'
          : 'w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-[hsl(var(--surface-2))] focus:bg-[hsl(var(--surface-2))] outline-none'
      }
    >
      {children}
    </button>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-2 py-1 text-[11px] text-muted uppercase tracking-wide', className)}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-[hsl(var(--border))]" />;
}

// local cn
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}
