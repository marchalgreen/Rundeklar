// src/components/windows/InventoryWindow.tsx
'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChartPieSlice, Check, Columns } from '@phosphor-icons/react';

import { useInventory, type AdjustmentReason, type InventoryItem } from '@/store/inventory';
import { useInventoryView, type SortKey } from '@/store/inventoryView';
import { fuzzyFilter, fuzzyFilterWithSource } from '@/lib/fuseSearch';
import { useDesktop } from '@/store/desktop';
import { useNetworkInventory } from '@/store/networkInventory';
import { useCatalog } from '@/store/catalog';
import { mapCatalogToRows, type CatalogRow } from '@/lib/catalog/toInventoryRows';

import InventoryCommandShelf from '@/components/inventory/Toolbar/InventoryCommandShelf';
import InventoryExportMenu from '@/components/inventory/InventoryExportMenu';
import InventoryImportButton from '@/components/inventory/InventoryImportButton';
import BulkBar from '@/components/inventory/BulkBar';
import StockAdjustDialog from '@/components/inventory/StockAdjustDialog';
import BarcodeLookupDialog from '@/components/inventory/BarcodeLookupDialog';
import LabelSheetDialog from '@/components/inventory/LabelSheetDialog';
import InventoryContextMenu from '@/components/inventory/InventoryContextMenu';
import NetworkRequestDialog from '@/components/inventory/NetworkRequestDialog';
import FacetSidebar, {
  type FacetOption,
  type FacetSection,
} from '@/components/inventory/FacetSidebar';

import * as XLSX from 'xlsx';

import '@glideapps/glide-data-grid/dist/index.css';
import {
  GridCellKind,
  type GridCell,
  type GridColumn,
  type Item,
  type GridSelection,
} from '@glideapps/glide-data-grid';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useInventoryGridColumns } from '@/components/inventory/gridColumns';
import {
  productCellRenderer,
  PRODUCT_CELL_LAYOUT,
  type ProductCellData,
} from '@/components/inventory/gridCells';
import { statusCellRenderer } from '@/components/inventory/gridStatusCell';
import openActionCellRenderer from '@/components/inventory/openActionCell';
import sourceBadgeCellRenderer from '@/components/inventory/sourceBadgeCell';
import {
  deriveBrand,
  deriveColor,
  deriveModel,
  deriveSizeLabel,
  getFacetCounts,
  getBrands,
  getModels,
  getStockStatus,
  type InventoryStockStatus,
} from '@/lib/inventoryFacets';

const DataEditor = dynamic(async () => (await import('@glideapps/glide-data-grid')).default, {
  ssr: false,
});

type Col = GridColumn & { id: string };

type ItemFacetMeta = {
  brand: string;
  model: string;
  size: string;
  category: InventoryItem['category'];
  color: string;
  stock: InventoryStockStatus;
};

type StoreRow = InventoryItem & { source: 'Store'; sourceLabel: 'Butik' };
type NetworkRow = InventoryItem & { source: 'Network'; sourceLabel: 'Kæde' };
type UnifiedRow = StoreRow | NetworkRow | CatalogRow;

const SOURCE_LABELS = {
  store: 'Butik',
  network: 'Kæde',
  catalog: 'Katalog',
} as const;

const EMPTY_SIZE_LABEL = '—';

function resolveSizeLabelForRow(row: UnifiedRow): string {
  if (row.source === 'Catalog') {
    const label = row.sizeLabel ? String(row.sizeLabel).trim() : '';
    return label.length > 0 ? label : EMPTY_SIZE_LABEL;
  }
  const derived = deriveSizeLabel(row);
  const trimmed = derived ? derived.trim() : '';
  return trimmed.length > 0 ? trimmed : EMPTY_SIZE_LABEL;
}

function getSizeSortMeta(row: UnifiedRow): { label: string; sortValue: number | null } {
  const label = resolveSizeLabelForRow(row);
  const match = label.match(/\d{2,3}/);
  if (!match) return { label, sortValue: null };
  const value = Number.parseInt(match[0], 10);
  return { label, sortValue: Number.isFinite(value) ? value : null };
}

function buildFacetOptions(
  entries: [string, number][],
  activeValues: readonly string[],
  {
    keepZero = false,
    sortMode = 'default',
  }: { keepZero?: boolean; sortMode?: 'default' | 'alpha' | 'numeric' | 'none' } = {},
): FacetOption[] {
  const activeSet = new Set(activeValues);
  const filtered = entries.filter(
    ([value, count]) => keepZero || count > 0 || activeSet.has(String(value)),
  );
  const sorted =
    sortMode === 'none'
      ? filtered
      : filtered.slice().sort((a, b) => {
          const aValue = String(a[0]);
          const bValue = String(b[0]);
          const aActive = activeSet.has(aValue);
          const bActive = activeSet.has(bValue);
          if (aActive !== bActive) return aActive ? -1 : 1;
          if (sortMode === 'numeric') {
            const ai = Number.parseInt(aValue, 10);
            const bi = Number.parseInt(bValue, 10);
            const aNum = Number.isFinite(ai);
            const bNum = Number.isFinite(bi);
            if (aNum && bNum) return ai - bi;
            if (aNum !== bNum) return aNum ? -1 : 1;
            return aValue.localeCompare(bValue, 'da');
          }
          if (sortMode === 'alpha') {
            return aValue.localeCompare(bValue, 'da');
          }
          if (b[1] !== a[1]) return b[1] - a[1];
          return aValue.localeCompare(bValue, 'da');
        });
  return sorted.map(([value, count]) => {
    const valueStr = String(value);
    const active = activeSet.has(valueStr);
    return {
      value: valueStr,
      label: valueStr,
      count,
      active,
      disabled: !active && count === 0,
    } satisfies FacetOption;
  });
}

/* ────────────────────────────────────────────────────────────
   Utils
   ──────────────────────────────────────────────────────────── */
function useThrottledCallback<T extends (...args: any[]) => void>(fn: T, ms: number) {
  const last = useRef(0);
  return useCallback(
    (...args: Parameters<T>) => {
      const now = performance.now();
      if (now - last.current < ms) return;
      last.current = now;
      fn(...args);
    },
    [fn, ms],
  );
}

/* ────────────────────────────────────────────────────────────
   Non-flicker hover preview (preload + fade, stays mounted)
   ──────────────────────────────────────────────────────────── */
function HoverPreview({ x, y, url }: { x: number; y: number; url: string | null }) {
  const [visibleUrl, setVisibleUrl] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0);
  const preloadRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      // fade out, then clear
      setOpacity(0);
      const t = setTimeout(() => setVisibleUrl(null), 150);
      return () => clearTimeout(t);
    }

    if (url === visibleUrl) {
      // same image, just move; ensure visible
      setOpacity(1);
      return;
    }

    const img = new Image();
    img.onload = () => {
      // only update if this is still the latest requested image
      preloadRef.current = img;
      setVisibleUrl(url);
      requestAnimationFrame(() => setOpacity(1));
    };
    img.src = url;

    return () => {
      preloadRef.current = null;
    };
  }, [url, visibleUrl]);

  if (!visibleUrl) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x + 16,
    top: y + 16,
    zIndex: 9999,
    background: 'linear-gradient(to bottom, hsl(var(--glass-from)), hsl(var(--glass-to)))',
    backdropFilter: 'blur(12px) brightness(1.1)',
    WebkitBackdropFilter: 'blur(12px) brightness(1.1)',
    border: '1px solid hsl(var(--line))',
    borderRadius: '12px',
    padding: '6px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
    pointerEvents: 'none',
    opacity,
    transition: 'opacity 120ms ease',
  };

  return createPortal(
    <div style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={visibleUrl}
        alt=""
        width={200}
        height={140}
        style={{ display: 'block', objectFit: 'cover', borderRadius: 10 }}
      />
    </div>,
    document.body,
  );
}

function SyncBadgeTooltip({ tooltip }: { tooltip: { x: number; y: number; text: string } | null }) {
  if (!tooltip) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: tooltip.x,
    top: tooltip.y,
    zIndex: 10000,
    background: 'linear-gradient(to bottom, hsl(var(--glass-from)), hsl(var(--glass-to)))',
    color: 'hsl(var(--foreground))',
    borderRadius: 10,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    border: '1px solid hsl(var(--line))',
    boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -120%)',
    whiteSpace: 'nowrap',
  };

  return createPortal(<div style={style}>{tooltip.text}</div>, document.body);
}

export default function InventoryWindow() {
  const { items, adjustQty } = useInventory();
  const {
    filter,
    setFilter,
    sort,
    setSort,
    hiddenCols,
    setHiddenCols,
    colWidths,
    setColWidth,
    stock,
    setStock,
    previewEnabled,
    setPreviewEnabled,
    facets,
    facetUi,
    toggleFacet,
    clearFacet,
    setFacetCollapsed,
    setFacetModelSearch,
    setFacetModelExpanded,
    resetFilters,
    savedViews,
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    currentViewId,
    resetToSeededViews,
    sourceMode,
    sourceFilter,
  } = useInventoryView();
  const { open: openWindow } = useDesktop();
  const net = useNetworkInventory();
  const networkItems = net.items;
  const catalogIndex = useCatalog((s) => s.index);
  const ensureCatalogLoaded = useCatalog((s) => s.ensureLoaded);

  // Ensure catalog fetch kicks off immediately on mount rather than during grid render paths.
  useEffect(() => {
    ensureCatalogLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBrandCollapse = useCallback(
    () => setFacetCollapsed('brand', !facetUi.collapsed.brand),
    [facetUi.collapsed.brand, setFacetCollapsed],
  );
  const toggleModelCollapse = useCallback(
    () => setFacetCollapsed('model', !facetUi.collapsed.model),
    [facetUi.collapsed.model, setFacetCollapsed],
  );
  const toggleSizeCollapse = useCallback(
    () => setFacetCollapsed('size', !facetUi.collapsed.size),
    [facetUi.collapsed.size, setFacetCollapsed],
  );
  const toggleCategoryCollapse = useCallback(
    () => setFacetCollapsed('category', !facetUi.collapsed.category),
    [facetUi.collapsed.category, setFacetCollapsed],
  );
  const toggleColorCollapse = useCallback(
    () => setFacetCollapsed('color', !facetUi.collapsed.color),
    [facetUi.collapsed.color, setFacetCollapsed],
  );
  const toggleStockCollapse = useCallback(
    () => setFacetCollapsed('stock', !facetUi.collapsed.stock),
    [facetUi.collapsed.stock, setFacetCollapsed],
  );
  const handleModelSearchChange = useCallback(
    (value: string) => setFacetModelSearch(value),
    [setFacetModelSearch],
  );
  const toggleModelExpanded = useCallback(
    () => setFacetModelExpanded(!facetUi.modelExpanded),
    [facetUi.modelExpanded, setFacetModelExpanded],
  );

  const [active, setActive] = useState<Item | null>(null);
  const activeRowRef = useRef<UnifiedRow | null>(null);
  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(undefined);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<{
    reason?: AdjustmentReason;
    note?: string;
  } | null>(null);

  const openAdjustDialog = useCallback(
    (opts?: { reason?: AdjustmentReason; note?: string }) => {
      const current = activeRowRef.current;
      if (!current || current.source === 'Catalog') return;
      setAdjustPreset(opts ?? null);
      setAdjustOpen(true);
    },
    [setAdjustOpen, setAdjustPreset],
  );
  const [scanOpen, setScanOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);

  useEffect(() => {
    if (!ensureCatalogLoaded) return;
    if (sourceMode === 'catalog' || sourceMode === 'all') {
      void ensureCatalogLoaded();
    }
  }, [ensureCatalogLoaded, sourceMode]);

  // container for the grid (not the whole window)
  const gridHostRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // "grid space" wrapper that should occupy remaining height; we measure it
  const gridSpaceRef = useRef<HTMLDivElement | null>(null);
  const [gridHeight, setGridHeight] = useState<number>(480);
  // Flag toggled when action cell handles opening so the row double-click doesn't trigger again
  const suppressNextOpenRef = useRef(false);
  const [scrollShadow, setScrollShadow] = useState({ left: false, right: false });
  const [qtyFlash, setQtyFlash] = useState<Record<string, 'up' | 'down'>>({});
  const qtyFlashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevQtyRef = useRef<Map<string, number>>(new Map());

  // hover preview state
  const [hover, setHover] = useState<{ x: number; y: number; url: string | null }>({
    x: 0,
    y: 0,
    url: null,
  });
  const [badgeTooltip, setBadgeTooltip] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );
  const [netReqOpen, setNetReqOpen] = useState(false);
  const [netReqSku, setNetReqSku] = useState<string | null>(null);
  const getNetworkBySku = net.getBySku;

  const partners = useMemo(
    () => getNetworkBySku(netReqSku ?? '') ?? [],
    [netReqSku, getNetworkBySku],
  );

  // grid metrics
  const HEADER_H = 36;
  const ROW_H = 36;
  const MIN_PRODUCT_W = 360;
  const MAX_PRODUCT_W = 900;

  const storeRows: StoreRow[] = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        source: 'Store' as const,
        sourceLabel: SOURCE_LABELS.store,
      })),
    [items],
  );

  const networkRows: NetworkRow[] = useMemo(
    () =>
      networkItems.map((item) => ({
        ...item,
        source: 'Network' as const,
        sourceLabel: SOURCE_LABELS.network,
      })),
    [networkItems],
  );

  const catalogRows: CatalogRow[] = useMemo(() => {
    if (!catalogIndex?.bySku) return [];
    return mapCatalogToRows(Array.from(catalogIndex.bySku.values()));
  }, [catalogIndex]);

  const facetMeta = useMemo(() => {
    const map = new Map<string, ItemFacetMeta>();
    const collect = (item: InventoryItem) => {
      map.set(item.id, {
        brand: deriveBrand(item),
        model: deriveModel(item),
        size: deriveSizeLabel(item),
        category: item.category,
        color: deriveColor(item),
        stock: getStockStatus(item, stock.lowThreshold),
      });
    };
    items.forEach(collect);
    networkItems.forEach(collect);
    catalogRows.forEach(collect);
    return map;
  }, [catalogRows, items, networkItems, stock.lowThreshold]);

  const mergedRows: UnifiedRow[] = useMemo(() => {
    if (sourceMode === 'store') return storeRows;
    if (sourceMode === 'network') return networkRows;
    if (sourceMode === 'catalog') return catalogRows;
    const combined: UnifiedRow[] = [...storeRows, ...networkRows, ...catalogRows];
    return combined.filter((row) => {
      if (row.source === 'Store') return sourceFilter.store;
      if (row.source === 'Network') return sourceFilter.network;
      if (row.source === 'Catalog') return sourceFilter.catalog;
      return true;
    });
  }, [catalogRows, networkRows, sourceFilter, sourceMode, storeRows]);

  const knownCategories = useMemo(() => {
    const categories = new Set<InventoryItem['category']>();
    storeRows.forEach((it) => categories.add(it.category));
    networkRows.forEach((it) => categories.add(it.category));
    catalogRows.forEach((it) => categories.add(it.category as InventoryItem['category']));
    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'da'));
  }, [storeRows, networkRows, catalogRows]);

  const activeFacetCount =
    (facets.brand?.length ?? 0) +
    (facets.model?.length ?? 0) +
    (facets.size?.length ?? 0) +
    (facets.category?.length ?? 0) +
    (facets.color?.length ?? 0) +
    (facets.stock?.length ?? 0);

  /* ---------- derive rows ---------- */
  const byCategory = useMemo(() => {
    if (filter.category === 'Alle') return mergedRows;
    return mergedRows.filter((row) => row.category === filter.category);
  }, [mergedRows, filter.category]);

  const bySearch = useMemo(() => {
    if (sourceMode === 'all') {
      return fuzzyFilterWithSource(byCategory as UnifiedRow[], filter.q);
    }
    return fuzzyFilter(byCategory as InventoryItem[], filter.q) as UnifiedRow[];
  }, [byCategory, filter.q, sourceMode]);

  const stockFiltered = useMemo(() => {
    if (stock.mode === 'all') return bySearch;
    return bySearch.filter((row) => {
      if ((row as UnifiedRow).source === 'Catalog') return true;
      if (stock.mode === 'out') return row.qty === 0;
      if (stock.mode === 'low') return row.qty > 0 && row.qty <= stock.lowThreshold;
      return row.qty > 0;
    });
  }, [bySearch, stock]);

  const facetFiltered = useMemo(() => {
    if (activeFacetCount === 0) return stockFiltered;
    return stockFiltered.filter((item) => {
      const meta = facetMeta.get(item.id);
      if (!meta) return true;
      if (facets.brand.length && !facets.brand.includes(meta.brand)) return false;
      if (facets.model.length && !facets.model.includes(meta.model)) return false;
      if (facets.size.length && !facets.size.includes(meta.size)) return false;
      if (facets.category.length && !facets.category.includes(meta.category)) return false;
      if (facets.color.length && !facets.color.includes(meta.color)) return false;
      if (facets.stock.length && !facets.stock.includes(meta.stock)) return false;
      return true;
    });
  }, [
    stockFiltered,
    facetMeta,
    facets.brand,
    facets.model,
    facets.size,
    facets.category,
    facets.color,
    facets.stock,
    activeFacetCount,
  ]);

  const facetCounts = useMemo(
    () =>
      getFacetCounts({
        items: stockFiltered.filter(
          (row) => (row as UnifiedRow).source !== 'Catalog',
        ) as InventoryItem[],
        facets,
        lowThreshold: stock.lowThreshold,
        knownCategories,
      }),
    [stockFiltered, facets, stock.lowThreshold, knownCategories],
  );

  const brandOptions = useMemo(() => {
    const active = facets.brand;
    return getBrands(facetCounts, active).map(({ value, count }) => {
      const isActive = active.includes(value);
      return {
        value,
        label: value,
        count,
        active: isActive,
        disabled: count === 0 && !isActive,
      } satisfies FacetOption;
    });
  }, [facetCounts, facets.brand]);

  const modelOptions = useMemo(() => {
    const active = facets.model;
    const entries = getModels(facetCounts, { active, search: facetUi.modelSearch });
    return entries.map(({ value, count }) => {
      const isActive = active.includes(value);
      return {
        value,
        label: value,
        count,
        active: isActive,
        disabled: count === 0 && !isActive,
      } satisfies FacetOption;
    });
  }, [facetCounts, facets.model, facetUi.modelSearch]);

  const categoryOptions = useMemo(() => {
    const entries = Array.from(facetCounts.category.entries());
    return buildFacetOptions(
      entries,
      facets.category.map((value) => String(value)),
      { keepZero: true },
    );
  }, [facetCounts, facets.category]);

  const sizeOptions = useMemo(() => {
    const entries = Array.from(facetCounts.size.entries());
    return buildFacetOptions(entries, facets.size, { sortMode: 'numeric' });
  }, [facetCounts, facets.size]);

  const colorOptions = useMemo(() => {
    const entries = Array.from(facetCounts.color.entries());
    return buildFacetOptions(entries, facets.color);
  }, [facetCounts, facets.color]);

  const stockOptions = useMemo(() => {
    const entries = Array.from(facetCounts.stock.entries());
    return buildFacetOptions(
      entries,
      facets.stock.map((value) => String(value)),
      { keepZero: true },
    );
  }, [facetCounts, facets.stock]);

  const modelExpanded = facetUi.modelExpanded || !!facetUi.modelSearch;

  const facetSections: FacetSection[] = useMemo(() => {
    const sections: FacetSection[] = [];
    if (brandOptions.length > 0) {
      sections.push({
        key: 'brand',
        title: 'Brand',
        options: brandOptions,
        collapsed: facetUi.collapsed.brand,
        onToggleCollapse: toggleBrandCollapse,
      });
    }
    if (modelOptions.length > 0) {
      sections.push({
        key: 'model',
        title: 'Model',
        options: modelOptions,
        collapsed: facetUi.collapsed.model,
        onToggleCollapse: toggleModelCollapse,
        searchPlaceholder: 'Søg modeller',
        searchValue: facetUi.modelSearch,
        onSearchChange: handleModelSearchChange,
        limit: 10,
        expanded: modelExpanded,
        onToggleExpand: toggleModelExpanded,
      });
    }
    if (sizeOptions.length > 0) {
      sections.push({
        key: 'size',
        title: 'Størrelse',
        options: sizeOptions,
        collapsed: facetUi.collapsed.size,
        onToggleCollapse: toggleSizeCollapse,
      });
    }
    if (categoryOptions.length > 0) {
      sections.push({
        key: 'category',
        title: 'Kategori',
        options: categoryOptions,
        collapsed: facetUi.collapsed.category,
        onToggleCollapse: toggleCategoryCollapse,
      });
    }
    if (colorOptions.length > 0) {
      sections.push({
        key: 'color',
        title: 'Farve / Index',
        options: colorOptions,
        collapsed: facetUi.collapsed.color,
        onToggleCollapse: toggleColorCollapse,
      });
    }
    if (stockOptions.length > 0) {
      sections.push({
        key: 'stock',
        title: 'Lagerstatus',
        options: stockOptions,
        collapsed: facetUi.collapsed.stock,
        onToggleCollapse: toggleStockCollapse,
      });
    }
    return sections;
  }, [
    brandOptions,
    modelOptions,
    categoryOptions,
    sizeOptions,
    colorOptions,
    stockOptions,
    facetUi.collapsed.brand,
    facetUi.collapsed.model,
    facetUi.collapsed.size,
    facetUi.collapsed.category,
    facetUi.collapsed.color,
    facetUi.collapsed.stock,
    facetUi.modelSearch,
    modelExpanded,
    toggleBrandCollapse,
    toggleModelCollapse,
    toggleSizeCollapse,
    toggleCategoryCollapse,
    toggleColorCollapse,
    toggleStockCollapse,
    handleModelSearchChange,
    toggleModelExpanded,
  ]);

  const sortKey = sort.key;
  const sortDir = sort.dir;
  const rows: UnifiedRow[] = useMemo(() => {
    const arr = facetFiltered.slice() as UnifiedRow[];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === 'size') {
        const aMeta = getSizeSortMeta(a);
        const bMeta = getSizeSortMeta(b);
        const aSort = aMeta.sortValue ?? Number.POSITIVE_INFINITY;
        const bSort = bMeta.sortValue ?? Number.POSITIVE_INFINITY;
        if (aSort !== bSort) return (aSort - bSort) * dir;
        const labelCmp = aMeta.label.localeCompare(bMeta.label, 'da');
        if (labelCmp !== 0) return labelCmp * dir;
        return (a.sku || '').localeCompare(b.sku || '', 'da') * dir;
      }
      let va: any = (a as any)[sortKey],
        vb: any = (b as any)[sortKey];
      if (sortKey === 'updatedAt') {
        va = +new Date(a.updatedAt);
        vb = +new Date(b.updatedAt);
      }
      return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * dir;
    });
    return arr;
  }, [facetFiltered, sortKey, sortDir]);

  const activeRow = active ? rows[active[1]] : null;
  activeRowRef.current = activeRow ?? null;
  const activeRowIsCatalog = activeRow?.source === 'Catalog';

  const savedViewEntries = useMemo(() => {
    return Object.values(savedViews)
      .slice()
      .sort((a, b) => {
        const aSeed = a.seeded ? 0 : 1;
        const bSeed = b.seeded ? 0 : 1;
        if (aSeed !== bSeed) return aSeed - bSeed;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [savedViews]);

  useEffect(() => {
    if (Object.keys(savedViews).length === 0) {
      resetToSeededViews();
    }
  }, [savedViews, resetToSeededViews]);

  const handleSaveView = useCallback(() => {
    const suggestion = filter.q ? filter.q : 'Ny visning';
    const name = window.prompt('Gem nuværende visning som…', suggestion);
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    saveCurrentView(trimmed);
  }, [filter.q, saveCurrentView]);

  const handleApplyView = useCallback(
    (id: string) => {
      applySavedView(id);
    },
    [applySavedView],
  );

  const handleDeleteView = useCallback(
    (id: string) => {
      const preset = savedViews[id];
      const confirmed = window.confirm(`Vil du slette visningen "${preset?.name ?? 'Visning'}"?`);
      if (!confirmed) return;
      deleteSavedView(id);
    },
    [deleteSavedView, savedViews],
  );

  const savedViewSummaries = useMemo(
    () =>
      savedViewEntries.map((view) => ({
        id: view.id,
        name: view.name,
        isActive: currentViewId === view.id,
        isSeeded: view.seeded ?? false,
      })),
    [savedViewEntries, currentViewId],
  );

  const totalFilterCount =
    (filter.q.trim() ? 1 : 0) + (stock.mode !== 'all' ? 1 : 0) + activeFacetCount;

  /* ---------- open detail window ---------- */
  const openItem = useCallback(
    (it: InventoryItem) => {
      if (!it?.id) return;
      const color = typeof it.color === 'string' && it.color.length > 0 ? it.color : undefined;
      const sizeLabel =
        typeof it.sizeLabel === 'string' && it.sizeLabel.length > 0 ? it.sizeLabel : undefined;
      openWindow({
        type: 'itemDetail',
        title: it.name || 'Vare',
        payload: {
          id: it.id,
          sku: it.sku,
          variantSku: it.sku,
          color,
          sizeLabel,
        },
      });
    },
    [openWindow],
  );

  // selection → indexes → items
  const selectedRowIndexes = useMemo(() => {
    if (!gridSelection || !('rows' in gridSelection) || !gridSelection.rows) return [];
    const idxs: number[] = [];

    const rowsVal = gridSelection.rows as any;
    if (rowsVal instanceof Set) {
      for (const r of rowsVal) if (typeof r === 'number') idxs.push(r);
    } else if (Array.isArray(rowsVal)) {
      rowsVal.forEach((range) => {
        if (Array.isArray(range)) {
          const [start, end] = range;
          for (let r = start; r <= end; r++) idxs.push(r);
        } else if (typeof range === 'number') idxs.push(range);
      });
    }

    return idxs.filter((i) => i >= 0 && i < rows.length);
  }, [gridSelection, rows.length]);

  const selectedItems = useMemo(
    () => selectedRowIndexes.map((i) => rows[i]),
    [selectedRowIndexes, rows],
  );

  // ---------- grid columns (centralized) ----------
  const { allCols: baseCols, getCellContent: baseGetCell } = useInventoryGridColumns(
    rows as InventoryItem[],
    {
      stock,
      sort,
      sourceMode,
    },
  );

  // Track the current grid width so we can stretch the product column
  const [gridW, setGridW] = useState(0);
  useEffect(() => {
    const host = gridHostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const scroller =
      (host.querySelector('.dvn-scroller') as HTMLDivElement | null) ?? host;
    scrollerRef.current = scroller;
    const update = () => setGridW(scroller.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    update();
    return () => observer.disconnect();
  }, []);

  const ROW_MARKER_W = 36; // left gutter reserved by Glide row markers
  const SCROLLBAR_W = 12; // coarse cross-platform scrollbar width

  const effectiveHiddenCols = useMemo(
    () => (sourceMode === 'all' ? hiddenCols : [...hiddenCols, 'source']),
    [hiddenCols, sourceMode],
  );

  const baseFixed = useMemo(() => {
    return baseCols
      .filter((c) => c.id !== 'product' && !effectiveHiddenCols.includes(c.id))
      .reduce((acc, col) => acc + (colWidths[col.id] ?? col.width ?? 120), 0);
  }, [baseCols, colWidths, effectiveHiddenCols]);

  const stretchedCols = useMemo(() => {
    const productHidden = effectiveHiddenCols.includes('product');
    if (productHidden) {
      return baseCols.map((col) => ({
        ...col,
        width: colWidths[col.id] ?? col.width,
      }));
    }

    const target = Math.max(0, gridW - ROW_MARKER_W - SCROLLBAR_W);
    const productCol = baseCols.find((c) => c.id === 'product');
    const savedProduct =
      colWidths.product ?? (productCol?.width ?? MIN_PRODUCT_W);
    const currentTotal = baseFixed + savedProduct;
    const extra = Math.max(0, target - currentTotal);
    const cap = sourceMode === 'all' ? Math.min(MAX_PRODUCT_W, 720) : MAX_PRODUCT_W;
    const stretched = Math.min(cap, Math.max(MIN_PRODUCT_W, savedProduct + extra));

    return baseCols.map((col) =>
      col.id === 'product'
        ? { ...col, width: stretched }
        : { ...col, width: colWidths[col.id] ?? col.width },
    );
  }, [baseCols, colWidths, baseFixed, gridW, effectiveHiddenCols, sourceMode]);

  const sizedCols = useMemo(() => {
    let list = stretchedCols;
    if (sourceMode !== 'all') {
      list = list.filter((col) => col.id !== 'source');
    }
    if (sourceMode === 'store' || sourceMode === 'catalog') {
      list = list.filter((col) => col.id !== 'stores');
    }
    return list.map((col) => ({ ...col, width: col.width }));
  }, [stretchedCols, sourceMode]);

  const hiddenColsKey = useMemo(() => effectiveHiddenCols.join('|'), [effectiveHiddenCols]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setGridW(scroller.clientWidth);
  }, [sourceMode, hiddenColsKey]);

  const productWidth = useMemo(
    () => stretchedCols.find((col) => col.id === 'product')?.width ?? 0,
    [stretchedCols],
  );

  const availableWidth = Math.max(0, gridW - ROW_MARKER_W - SCROLLBAR_W);
  const hasOverflow =
    !hiddenCols.includes('product') && baseFixed + productWidth > availableWidth + 1;

  // Observe the gridSpace wrapper to compute a pixel-perfect height for DataEditor
  useEffect(() => {
    const el = gridSpaceRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      if (h > 120 && h !== gridHeight) setGridHeight(h);
    });
    ro.observe(el);
    // Initialize once
    const init = el.clientHeight;
    if (init > 120) setGridHeight(init);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // visibility
  const visibleCols = useMemo(() => {
    // `actions` controls row operations; never hide it even when toggled off
    return sizedCols.filter((c) => c.id === 'actions' || !hiddenCols.includes(c.id));
  }, [sizedCols, hiddenCols]);

  useEffect(() => {
    const host = gridHostRef.current;
    if (!host) return;
    const scroller = host.querySelector('.dvn-scroller') as HTMLDivElement | null;
    if (!scroller) return;

    const updateShadows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);
      setScrollShadow({
        left: scrollLeft > 0,
        right: scrollLeft < maxScroll - 1,
      });
    };

    updateShadows();
    scroller.addEventListener('scroll', updateShadows, { passive: true });
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateShadows) : null;
    resizeObserver?.observe(scroller);

    return () => {
      scroller.removeEventListener('scroll', updateShadows);
      resizeObserver?.disconnect();
    };
  }, [visibleCols, rows.length]);

  useEffect(() => {
    const prev = prevQtyRef.current;
    const nextMap = new Map<string, number>();
    const changes: Array<{ id: string; dir: 'up' | 'down' }> = [];

    for (const row of rows) {
      nextMap.set(row.id, row.qty);
      const prevQty = prev.get(row.id);
      if (typeof prevQty === 'number' && prevQty !== row.qty) {
        changes.push({ id: row.id, dir: row.qty > prevQty ? 'up' : 'down' });
      }
    }

    const removed: string[] = [];
    prev.forEach((_, id) => {
      if (!nextMap.has(id)) removed.push(id);
    });

    prevQtyRef.current = nextMap;

    if (removed.length > 0) {
      setQtyFlash((curr) => {
        if (removed.every((id) => !(id in curr))) return curr;
        const next = { ...curr };
        for (const id of removed) delete next[id];
        return next;
      });
      for (const id of removed) {
        const timer = qtyFlashTimers.current.get(id);
        if (timer) {
          clearTimeout(timer);
          qtyFlashTimers.current.delete(id);
        }
      }
    }

    if (changes.length === 0) return;

    setQtyFlash((curr) => {
      const next = { ...curr };
      for (const change of changes) next[change.id] = change.dir;
      return next;
    });

    for (const change of changes) {
      const existing = qtyFlashTimers.current.get(change.id);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setQtyFlash((curr) => {
          if (!(change.id in curr)) return curr;
          const { [change.id]: _omit, ...rest } = curr;
          return rest;
        });
        qtyFlashTimers.current.delete(change.id);
      }, 250);
      qtyFlashTimers.current.set(change.id, timeout);
    }
  }, [rows]);

  useEffect(
    () => () => {
      qtyFlashTimers.current.forEach((timer) => clearTimeout(timer));
      qtyFlashTimers.current.clear();
    },
    [],
  );

  // map visible index → base index for resolver
  const getCellContent = useCallback(
    ([visibleColIdx, rowIdx]: Item): GridCell => {
      const colId = visibleCols[visibleColIdx]?.id;
      if (!colId) return { kind: GridCellKind.Text, data: '', displayData: '' } as GridCell;
      const baseIdx = baseCols.findIndex((c) => c.id === colId);
      let cell = baseGetCell([baseIdx, rowIdx]);
      if (colId === 'qty') {
        const row = rows[rowIdx];
        const flash = row ? qtyFlash[row.id] : undefined;
        if (flash && cell.kind === GridCellKind.Number) {
          const tone = flash === 'up' ? '--svc-check' : '--svc-repair';
          cell = {
            ...cell,
            themeOverride: {
              ...(cell.themeOverride ?? {}),
              bgCell: `hsl(var(${tone}) / 0.22)`,
              bgCellMedium: `hsl(var(${tone}) / 0.16)`,
              accentColor: `hsl(var(${tone}))`,
              accentLight: `hsl(var(${tone}) / 0.28)`,
            },
          } as typeof cell;
        }
      }
      return cell;
    },
    [baseCols, visibleCols, baseGetCell, rows, qtyFlash],
  );

  /* ---------- grid callbacks ---------- */
  const onCellEdited = useCallback(
    (cell: Item, newValue: GridCell) => {
      const [col, row] = cell;
      const item = rows[row];
      const key = visibleCols[col].id;
      if (key === 'qty' && newValue.kind === GridCellKind.Number) {
        if ((item as UnifiedRow | undefined)?.source === 'Catalog') return;
        const next = Math.max(0, Math.round(newValue.data ?? 0));
        const delta = next - item.qty;
        if (delta !== 0) adjustQty(item.id, delta);
      }
    },
    [adjustQty, visibleCols, rows],
  );

  const onHeaderClicked = useCallback(
    (colIndex: number) => {
      const key = visibleCols[colIndex].id as SortKey | 'status' | 'brand' | 'product' | 'actions';
      // derived columns don't sort; keep current sort state
      if (key === 'actions' || key === 'status' || key === 'brand' || key === 'product') return;
      if (key === sort.key) setSort(key, sort.dir === 'asc' ? 'desc' : 'asc');
      else setSort(key, 'asc');
    },
    [visibleCols, sort, setSort],
  );

  const onCellActivated = useCallback(
    (cell: Item) => {
      setActive(cell);
      const [colIndex, rowIndex] = cell;
      const colId = visibleCols[colIndex]?.id;
      const row = rows[rowIndex];
      if (!colId || !row) return;

      if (colId === 'actions') {
        suppressNextOpenRef.current = true;
        const roleSource = (row as any)?.source;
        if (roleSource === 'Network') {
          try {
            const partners = useNetworkInventory.getState().getBySku?.(row?.sku ?? '') ?? [];
            const hasStock = partners.some((p: any) => (p?.qty ?? 0) > 0);
            if (hasStock) {
              setNetReqSku(row.sku);
              setNetReqOpen(true);
            }
          } catch {
            // If network inventory state is unavailable, do nothing
          }
        } else if (roleSource === 'Catalog') {
          const href = (row as any)?.catalogUrl as string | undefined;
          if (href && typeof window !== 'undefined') {
            window.open(href, '_blank', 'noopener,noreferrer');
          } else {
            openItem(row);
          }
        } else {
          openItem(row);
        }
        setTimeout(() => {
          suppressNextOpenRef.current = false;
        }, 150);
        return;
      }

      if (colId === 'stores') {
        if ((row as any).source === 'Network') {
          setNetReqSku(row.sku);
          setNetReqOpen(true);
        }
        return;
      }
    },
    [visibleCols, rows, openItem, setNetReqSku, setNetReqOpen, suppressNextOpenRef],
  );

  // Hover preview + sync tooltip: scoped only to grid container, throttled to ~30fps
  const handleMouseMove = useThrottledCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const host = gridHostRef.current;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    if (localY <= HEADER_H) {
      if (previewEnabled) setHover((h) => (h.url ? { ...h, url: null } : h));
      setBadgeTooltip((prev) => (prev ? null : prev));
      return;
    }

    const rowIndex = Math.floor((localY - HEADER_H) / ROW_H);
    if (rowIndex < 0 || rowIndex >= rows.length) {
      if (previewEnabled) setHover((h) => (h.url ? { ...h, url: null } : h));
      setBadgeTooltip((prev) => (prev ? null : prev));
      return;
    }

    const contentX = localX - ROW_MARKER_W;
    if (contentX < 0) {
      if (previewEnabled) setHover((h) => (h.url ? { ...h, url: null } : h));
      setBadgeTooltip((prev) => (prev ? null : prev));
      return;
    }

    let x = 0;
    let hoveredColId: string | null = null;
    let colStart = 0;
    let colWidth = 0;
    for (const c of visibleCols) {
      const w = c.width ?? 120;
      if (contentX >= x && contentX < x + w) {
        hoveredColId = c.id;
        colStart = x;
        colWidth = w;
        break;
      }
      x += w;
    }

    if (hoveredColId === 'source') {
      // Source tooltip (Kilde)
      const row = rows[rowIndex] as any;
      const label =
        row?.sourceLabel ??
        (row?.source === 'Network' ? 'Kæde' : row?.source === 'Catalog' ? 'Katalog' : 'Butik');
      setBadgeTooltip({
        x: e.clientX + 12,
        y: e.clientY + 12,
        text: `Kilde: ${label}`,
      });
      // clear image preview
      if (previewEnabled) setHover((h) => (h.url ? { ...h, url: null } : h));
      return;
    }

    if (hoveredColId !== 'product') {
      if (previewEnabled) setHover((h) => (h.url ? { ...h, url: null } : h));
      setBadgeTooltip((prev) => (prev ? null : prev));
      return;
    }

    const baseIdx = baseCols.findIndex((c) => c.id === 'product');
    const cell = baseGetCell([baseIdx, rowIndex]);

    let nextPreview: string | null = null;
    let tooltip: { x: number; y: number; text: string } | null = null;

    if (cell.kind === GridCellKind.Custom) {
      const data = (cell as any).data as ProductCellData | undefined;
      if (data) {
        if (previewEnabled) {
          nextPreview = data.thumbUrl ?? null;
        }
        // Badge is drawn on the RIGHT by productCellRenderer; align hitbox with renderer output
        if (data.syncConfidence && data.syncLabel) {
          const colLocalX = contentX - colStart;
          const rowTop = HEADER_H + rowIndex * ROW_H;
          const rowLocalY = localY - rowTop;
          const PAD_X = PRODUCT_CELL_LAYOUT.paddingX;
          const BADGE = PRODUCT_CELL_LAYOUT.badgeSize;
          const TOL = 6; // hover tolerance so it feels forgiving
          const badgeCenterX = colWidth - PAD_X - BADGE / 2;
          const badgeLeft = badgeCenterX - BADGE / 2 - TOL;
          const badgeRight = badgeCenterX + BADGE / 2 + TOL;
          const badgeCenterY = ROW_H / 2;
          const badgeTop = badgeCenterY - BADGE / 2 - TOL;
          const badgeBottom = badgeCenterY + BADGE / 2 + TOL;
          if (
            colLocalX >= badgeLeft &&
            colLocalX <= badgeRight &&
            rowLocalY >= badgeTop &&
            rowLocalY <= badgeBottom
          ) {
            tooltip = {
              x: e.clientX + 12,
              y: e.clientY + 12,
              text: data.syncLabel,
            };
          }
        }
      }
    }

    if (previewEnabled) {
      setHover({ x: e.clientX, y: e.clientY, url: nextPreview });
    } else {
      setHover((h) => (h.url ? { ...h, url: null } : h));
    }

    if (tooltip) setBadgeTooltip(tooltip);
    else setBadgeTooltip((prev) => (prev ? null : prev));
  }, 32);

  const onMouseLeave = useCallback(() => {
    setHover((h) => ({ ...h, url: null }));
    setBadgeTooltip(null);
  }, []);

  const handleColumnResize = useCallback(
    (_column: GridColumn, newSize: number, columnIndex: number) => {
      const col = visibleCols[columnIndex];
      if (!col) return;
      setColWidth(col.id, newSize);
    },
    [visibleCols, setColWidth],
  );

  /* ---------- Export helpers ---------- */
  function exportSelectionCsv() {
    const visibleIds = visibleCols.map((c) => c.id).filter((id) => id !== 'actions');
    const data = selectedItems.map((it) => {
      const row: Record<string, unknown> = {};
      for (const id of visibleIds) (row as any)[id] = (it as any)[id];
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Selection');
    const file = `selection_${new Date().toISOString().slice(0, 10)}.csv`;
    XLSX.writeFile(wb, file, { bookType: 'csv' });
  }

  function exportSelectionXlsx() {
    const visibleIds = visibleCols.map((c) => c.id).filter((id) => id !== 'actions');
    const data = selectedItems.map((it) => {
      const row: Record<string, unknown> = {};
      for (const id of visibleIds) (row as any)[id] = (it as any)[id];
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Selection');
    const file = `selection_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, file);
  }

  function clearSelection() {
    setGridSelection(undefined);
  }

  const commandButtonClass =
    'inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--line))] bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/75 shadow-[0_10px_24px_hsl(var(--accent-blue)/0.05)] transition hover:text-foreground hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]';

  /* ---------- render ---------- */

  return (
    <div
      className={cn(
        'win-frame card-glass-active rounded-2xl p-4 md:p-6 space-y-4 flex flex-col h-full',
      )}
      data-active
    >
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <h2 className="text-base md:text-lg font-medium text-foreground">Varelager</h2>
        <div className="text-xs text-muted">
          v3 • Fuzzy & Lagerstatus ({sort.key} {sort.dir})
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:gap-6 xl:gap-8 flex-1 min-h-0 overflow-visible">
        <div
          className="lg:flex-shrink-0 min-h-0 overflow-visible"
          style={{ width: 'clamp(220px, 19vw, 280px)' }}
        >
          <div className="space-y-3 overflow-visible pr-3">
            {facetSections.length > 0 && (
              <FacetSidebar
                sections={facetSections}
                onToggle={toggleFacet}
                onClear={(key) => clearFacet(key)}
                onClearAll={activeFacetCount > 0 ? () => clearFacet() : undefined}
              />
            )}
          </div>
        </div>

        {/* Right column: allow soft glows to extend beyond */}
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-visible">
          {/* Toolbar + segments shouldn't be clipped */}
          <div className="overflow-visible">
            <InventoryCommandShelf
              q={filter.q}
              onQChange={(v) => setFilter(v, filter.category)}
              category={filter.category}
              onCategoryChange={(c) => setFilter(filter.q, c)}
              stockMode={stock.mode}
              lowThreshold={stock.lowThreshold}
              onStockChange={(m) => setStock(m)}
              resultCount={rows.length}
              activeFilterCount={totalFilterCount}
              onClearFilters={resetFilters}
              savedViews={savedViewSummaries}
              onSaveView={handleSaveView}
              onApplyView={handleApplyView}
              onDeleteView={handleDeleteView}
              columnsMenu={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={commandButtonClass}>
                      <Columns size={16} weight="duotone" />
                      <span className="hidden sm:inline">Kolonner</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-xl">
                    <DropdownMenuLabel className="text-xs px-2 text-muted-foreground">
                      Vis kolonner
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {/* Hide toggle excludes the non-optional actions column */}
                    {baseCols
                      .filter((c) => c.id !== 'actions')
                      .map((c) => (
                        <DropdownMenuCheckboxItem
                          key={c.id}
                          checked={!hiddenCols.includes(c.id)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? hiddenCols.filter((x) => x !== c.id)
                              : [...hiddenCols, c.id];
                            setHiddenCols(next);
                          }}
                          className="text-xs flex items-center gap-2 rounded-xl px-2 py-1.5"
                        >
                          <Check
                            size={14}
                            weight="bold"
                            className={cn(
                              'transition-opacity',
                              !hiddenCols.includes(c.id)
                                ? 'opacity-100 text-[hsl(var(--accent-blue))]'
                                : 'opacity-0',
                            )}
                          />
                          {c.title || (c.id === 'actions' ? ' ' : '')}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
              exportMenu={<InventoryExportMenu />}
              importButton={<InventoryImportButton />}
              dashboardButton={
                <button
                  type="button"
                  className={commandButtonClass}
                  onClick={() =>
                    openWindow({
                      type: 'inventoryDashboard',
                      title: 'Lager-dashboard',
                    })
                  }
                >
                  <ChartPieSlice size={16} weight="duotone" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              }
              onAdjust={() => openAdjustDialog()}
              onScan={() => setScanOpen(true)}
              onLabels={() => setLabelsOpen(true)}
              canAdjust={!!activeRow && !activeRowIsCatalog}
              canLabels={rows.length > 0}
              previewEnabled={previewEnabled}
              onTogglePreview={setPreviewEnabled}
            />
          </div>

          {selectedItems.length > 0 && (
            <div className="pl-0">
              <BulkBar
                count={selectedItems.length}
                onExportCsv={exportSelectionCsv}
                onExportXlsx={exportSelectionXlsx}
                onLabels={() => setLabelsOpen(true)}
                onClear={clearSelection}
              />
            </div>
          )}

          <div ref={gridSpaceRef} className="flex-1 min-h-0 relative">
            <div
              ref={gridHostRef}
              className="relative h-full overflow-hidden rounded-3xl border border-[hsl(var(--line))] bg-white/70 shadow-[0_24px_48px_hsl(var(--accent-blue)/0.12)] backdrop-blur grid-edge-fade"
              // Reveal the right fade only when the grid actually overflows
              style={
                {
                  ['--has-overflow' as any]: hasOverflow ? 1 : 0,
                } as React.CSSProperties
              }
              onMouseMove={handleMouseMove}
              onMouseLeave={onMouseLeave}
              onDoubleClickCapture={(e) => {
                if (suppressNextOpenRef.current) {
                  e.stopPropagation();
                  e.preventDefault();
                  return;
                }
                const host = gridHostRef.current;
                if (!host) return;
                const rect = host.getBoundingClientRect();
                const localX = e.clientX - rect.left;
                const localY = e.clientY - rect.top;
                if (localY <= HEADER_H) return;
                const rowIndex = Math.floor((localY - HEADER_H) / ROW_H);
                if (rowIndex < 0 || rowIndex >= rows.length) return;
                const contentX = localX - ROW_MARKER_W;
                if (contentX >= 0) {
                  let x = 0;
                  let hoveredColId: string | null = null;
                  for (const c of visibleCols) {
                    const w = c.width ?? 120;
                    if (contentX >= x && contentX < x + w) {
                      hoveredColId = c.id;
                      break;
                    }
                    x += w;
                  }
                  if (hoveredColId === 'actions') {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                  }
                }
                const it = rows[rowIndex];
                if (it) openItem(it);
              }}
            >
              <DataEditor
                // Keep instance stable when data changes; only remount when the schema changes
                key={`grid:${visibleCols.map((c) => c.id).join(',')}`}
                columns={visibleCols as Col[]}
                getCellContent={getCellContent}
                customRenderers={[
                  productCellRenderer,
                  statusCellRenderer,
                  openActionCellRenderer,
                  sourceBadgeCellRenderer,
                ]}
                rows={rows.length}
                onCellEdited={onCellEdited}
                onHeaderClicked={(idx) => {
                  const key = visibleCols[idx].id as
                    | SortKey
                    | 'status'
                    | 'brand'
                    | 'product'
                    | 'actions';
                  if (key === 'actions' || key === 'status' || key === 'brand' || key === 'product')
                    return;
                  if (key === sort.key) setSort(key, sort.dir === 'asc' ? 'desc' : 'asc');
                  else setSort(key, 'asc');
                }}
                onCellActivated={onCellActivated as any}
                gridSelection={gridSelection}
                onGridSelectionChange={setGridSelection}
                rowMarkers="both"
                rowHeight={ROW_H}
                headerHeight={HEADER_H}
                height={gridHeight}
                smoothScrollX
                smoothScrollY
                onColumnResize={handleColumnResize}
                onColumnResizeEnd={handleColumnResize}
              />

              {scrollShadow.left && (
                <div
                  className="pointer-events-none absolute left-0 w-12"
                  style={{
                    top: HEADER_H,
                    bottom: 0,
                    background:
                      'linear-gradient(to right, hsl(var(--surface) / 0.95), transparent)',
                  }}
                />
              )}
              {scrollShadow.right && (
                <div
                  className="pointer-events-none absolute right-0 w-12"
                  style={{
                    top: HEADER_H,
                    bottom: 0,
                    background: 'linear-gradient(to left, hsl(var(--surface) / 0.95), transparent)',
                  }}
                />
              )}

              <InventoryContextMenu
                wrapperRef={gridHostRef}
                rows={rows}
                selectedItems={selectedItems}
                filter={filter}
                setFilter={setFilter}
                adjustQty={adjustQty}
                openAdjustDialog={openAdjustDialog}
                setLabelsOpen={setLabelsOpen}
                setScanOpen={setScanOpen}
                exportSelectionCsv={exportSelectionCsv}
                exportSelectionXlsx={exportSelectionXlsx}
                setGridSelection={setGridSelection}
                openItem={openItem}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hover overlays (portals) */}
      <HoverPreview x={hover.x} y={hover.y} url={previewEnabled ? hover.url : null} />
      <SyncBadgeTooltip tooltip={badgeTooltip} />

      {/* Dialogs */}
      <StockAdjustDialog
        open={adjustOpen && !activeRowIsCatalog}
        onOpenChange={(next) => {
          setAdjustOpen(next);
          if (!next) setAdjustPreset(null);
        }}
        itemId={!activeRowIsCatalog ? activeRow?.id ?? null : null}
        itemName={!activeRowIsCatalog ? activeRow?.name : undefined}
        initialReason={adjustPreset?.reason}
        initialNote={adjustPreset?.note}
      />
      <BarcodeLookupDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResolve={(code) => setFilter(code, filter.category)}
      />
      <LabelSheetDialog
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        item={activeRow ?? rows[0] ?? null}
        selectedItems={selectedItems}
      />
      <NetworkRequestDialog
        open={netReqOpen}
        sku={netReqSku ?? ''}
        name={rows.find((x) => x.sku === netReqSku)?.name ?? ''}
        partners={partners}
        onClose={() => {
          setNetReqOpen(false);
          setNetReqSku(null);
        }}
        onSend={(p) => {
          // toast.success(`Forespørgsel sendt til ${p.partner}`);
          setNetReqOpen(false);
          setNetReqSku(null);
        }}
      />

      <div className="sr-only" aria-live="polite">
        {rows.length} varer i visning.
      </div>
    </div>
  );
}
