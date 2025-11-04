'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { InventoryCategory } from './inventory';
import type { InventoryStockStatus } from '@/lib/inventoryFacets';

/** Sorting over known inventory columns */
export type SortKey = 'sku' | 'name' | 'category' | 'size' | 'qty' | 'updatedAt';
export type SortDir = 'asc' | 'desc';

/** Stock status filter */
export type StockFilter = 'all' | 'in' | 'low' | 'out';

/** View density for the grid */
export type ViewDensity = 'comfort' | 'compact';

export type FacetKey = 'brand' | 'model' | 'size' | 'category' | 'color' | 'stock';

export type FacetSelections = {
  brand: string[];
  model: string[];
  size: string[];
  category: InventoryCategory[];
  color: string[];
  stock: InventoryStockStatus[];
};

type FacetCollapsedState = Record<FacetKey, boolean>;

export interface FacetUiState {
  collapsed: FacetCollapsedState;
  modelSearch: string;
  modelExpanded: boolean;
}

const FACET_KEYS: readonly FacetKey[] = ['brand', 'model', 'size', 'category', 'color', 'stock'];

export interface FacetPreset {
  id: string;
  name: string;
  sort: { key: SortKey; dir: SortDir };
  filter: { q: string; category: 'Alle' | InventoryCategory };
  stock: { mode: StockFilter; lowThreshold: number };
  facets: FacetSelections;
  createdAt: string;
  updatedAt: string;
  seeded?: boolean;
};

export type SourceMode = 'store' | 'network' | 'catalog' | 'all';

export interface ViewState {
  /** Columns hidden by the user (ids must match GridColumn.id) */
  hiddenCols: string[];

  /** User-defined column widths (by column id) */
  colWidths: Record<string, number>;

  /** Sort state */
  sort: { key: SortKey; dir: SortDir };

  /** Text/category filters */
  filter: { q: string; category: 'Alle' | InventoryCategory };

  /** Stock filter + low threshold */
  stock: { mode: StockFilter; lowThreshold: number };

  /** Density (affects row height / paddings) */
  density: ViewDensity;

  /** Selected row ids (optional; for bulk ops and restoring selection) */
  selectedIds: string[];

  /** Hover preview for Produkt cell thumbnails */
  previewEnabled: boolean;

  /** Selected facet values */
  facets: FacetSelections;

  /** UI state for facet panels */
  facetUi: FacetUiState;

  /** Saved view presets */
  savedViews: Record<string, FacetPreset>;

  /** Currently applied view id, if any */
  currentViewId: string | null;

  /** Selected source mode */
  sourceMode: SourceMode;
  /** When in 'all' mode, which sources remain visible */
  sourceFilter: { store: boolean; network: boolean; catalog: boolean };

  // ---- actions ----
  setHiddenCols: (cols: string[]) => void;
  setColWidth: (colId: string, width: number) => void;
  setSort: (key: SortKey, dir: SortDir) => void;
  setFilter: (q: string, category: ViewState['filter']['category']) => void;
  setStock: (mode: StockFilter) => void;
  setLowThreshold: (n: number) => void;
  setDensity: (d: ViewDensity) => void;
  setSelected: (ids: string[]) => void;
  setPreviewEnabled: (on: boolean) => void;
  toggleFacet: (key: FacetKey, value: string) => void;
  clearFacet: (key?: FacetKey) => void;
  setFacetCollapsed: (key: FacetKey, collapsed: boolean) => void;
  setFacetModelSearch: (query: string) => void;
  setFacetModelExpanded: (expanded: boolean) => void;
  resetFilters: () => void;
  saveCurrentView: (name: string) => string | null;
  applySavedView: (id: string) => void;
  deleteSavedView: (id: string) => void;
  resetToSeededViews: () => void;
  setSourceMode: (mode: SourceMode) => void;
  toggleSourceFilter: (key: 'store' | 'network' | 'catalog') => void;
}

/**
 * Persisted inventory view preferences
 * - Uses localStorage under key "inventory-view"
 * - Keep this client-only (used inside client components)
 */
const emptyFacets = (): FacetSelections => ({
  brand: [],
  model: [],
  size: [],
  category: [],
  color: [],
  stock: [],
});

function cloneFacets(facets: FacetSelections): FacetSelections {
  return {
    brand: [...(facets.brand ?? [])],
    model: [...(facets.model ?? [])],
    size: [...(facets.size ?? [])],
    category: [...(facets.category ?? [])],
    color: [...(facets.color ?? [])],
    stock: [...(facets.stock ?? [])],
  };
}

function generateViewId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = slug || 'view';
  return `${id}-${Date.now().toString(36)}`;
}

const defaultFacetUi = (): FacetUiState => ({
  collapsed: {
    brand: false,
    model: false,
    size: false,
    category: false,
    color: false,
    stock: false,
  },
  modelSearch: '',
  modelExpanded: false,
});

const normalizeFacets = (facets?: Partial<FacetSelections> | null): FacetSelections => ({
  brand: Array.isArray(facets?.brand) ? [...(facets?.brand as string[])] : [],
  model: Array.isArray(facets?.model) ? [...(facets?.model as string[])] : [],
  size: Array.isArray(facets?.size) ? [...(facets?.size as string[])] : [],
  category: Array.isArray(facets?.category)
    ? [...(facets?.category as InventoryCategory[])]
    : [],
  color: Array.isArray(facets?.color) ? [...(facets?.color as string[])] : [],
  stock: Array.isArray(facets?.stock)
    ? [...(facets?.stock as InventoryStockStatus[])]
    : [],
});

const SEEDED_VIEW_DEFS = [
  {
    id: 'seed-critical-out',
    name: 'Kritisk (Udsolgt)',
    apply: (base: {
      sort: ViewState['sort'];
      filter: ViewState['filter'];
      stock: ViewState['stock'];
    }) => ({
      sort: base.sort,
      filter: { ...base.filter, q: '', category: 'Alle' as ViewState['filter']['category'] },
      stock: { ...base.stock, mode: 'out' as StockFilter },
      facets: {
        ...emptyFacets(),
        stock: ['out'],
      } as FacetSelections,
    }),
  },
  {
    id: 'seed-low-stock',
    name: 'Lavt lager',
    apply: (base: {
      sort: ViewState['sort'];
      filter: ViewState['filter'];
      stock: ViewState['stock'];
    }) => ({
      sort: base.sort,
      filter: { ...base.filter, q: '', category: 'Alle' as ViewState['filter']['category'] },
      stock: { ...base.stock, mode: 'low' as StockFilter },
      facets: {
        ...emptyFacets(),
        stock: ['low'],
      } as FacetSelections,
    }),
  },
  {
    id: 'seed-sunglasses',
    name: 'Solbriller',
    apply: (base: {
      sort: ViewState['sort'];
      filter: ViewState['filter'];
      stock: ViewState['stock'];
    }) => ({
      sort: base.sort,
      filter: { ...base.filter, category: 'Sunglasses' as InventoryCategory },
      stock: { ...base.stock, mode: 'all' as StockFilter },
      facets: {
        ...emptyFacets(),
        category: ['Sunglasses'],
      } as FacetSelections,
    }),
  },
  {
    id: 'seed-unlinked',
    name: 'Ikke linket',
    apply: (base: {
      sort: ViewState['sort'];
      filter: ViewState['filter'];
      stock: ViewState['stock'];
    }) => ({
      sort: base.sort,
      filter: { ...base.filter, q: '', category: 'Alle' as ViewState['filter']['category'] },
      stock: { ...base.stock, mode: 'all' as StockFilter },
      facets: {
        ...emptyFacets(),
        brand: ['Other'],
        model: ['Other'],
      } as FacetSelections,
    }),
  },
] as const;

const SEEDED_VIEW_IDS = new Set<string>(SEEDED_VIEW_DEFS.map((def) => def.id));

function buildFacetPreset(
  name: string,
  id: string,
  overrides: { sort: ViewState['sort']; filter: ViewState['filter']; stock: ViewState['stock']; facets: FacetSelections },
  timestamp: string,
): FacetPreset {
  return {
    id,
    name,
    sort: overrides.sort,
    filter: overrides.filter,
    stock: overrides.stock,
    facets: cloneFacets(overrides.facets),
    createdAt: timestamp,
    updatedAt: timestamp,
    seeded: true,
  };
}

const createSeededViews = (state?: Partial<Pick<ViewState, 'sort' | 'filter' | 'stock'>>): Record<string, FacetPreset> => {
  const baseSort = state?.sort ?? { key: 'sku', dir: 'asc' };
  const baseFilter = state?.filter ?? { q: '', category: 'Alle' };
  const baseStock = state?.stock ?? { mode: 'all', lowThreshold: 5 };
  const now = new Date().toISOString();
  return SEEDED_VIEW_DEFS.reduce<Record<string, FacetPreset>>((acc, def) => {
    const presetConfig = def.apply({
      sort: baseSort,
      filter: baseFilter,
      stock: baseStock,
    });
    acc[def.id] = buildFacetPreset(def.name, def.id, presetConfig, now);
    return acc;
  }, {});
};

function normalizeFacetUi(input?: Partial<FacetUiState> | null): FacetUiState {
  const defaults = defaultFacetUi();
  const collapsedInput: Partial<FacetCollapsedState> = input?.collapsed ?? {};
  const collapsed = { ...defaults.collapsed } as FacetCollapsedState;
  for (const key of FACET_KEYS) {
    collapsed[key] = collapsedInput?.[key] ?? defaults.collapsed[key];
  }
  return {
    collapsed,
    modelSearch: input?.modelSearch ?? defaults.modelSearch,
    modelExpanded: input?.modelExpanded ?? defaults.modelExpanded,
  };
}

function normalizeSavedViews(
  raw: Record<string, Partial<FacetPreset>> | undefined,
  base: Pick<ViewState, 'sort' | 'filter' | 'stock'>,
): Record<string, FacetPreset> {
  const normalized: Record<string, FacetPreset> = {};
  if (!raw) return normalized;
  const now = new Date().toISOString();
  for (const [id, value] of Object.entries(raw)) {
    if (!value) continue;
    const presetId = value.id ?? id;
    const name = value.name ?? 'Gemte visning';
    const sort = value.sort ?? base.sort;
    const filter = value.filter ?? base.filter;
    const stock = value.stock ?? base.stock;
    const facets = normalizeFacets(value.facets as Partial<FacetSelections> | null);
    normalized[presetId] = {
      id: presetId,
      name,
      sort,
      filter,
      stock,
      facets,
      createdAt: value.createdAt ?? now,
      updatedAt: value.updatedAt ?? value.createdAt ?? now,
      seeded: value.seeded ?? SEEDED_VIEW_IDS.has(presetId),
    };
  }
  return normalized;
}

export const useInventoryView = create<ViewState>()(
  persist(
    (set, get) => ({
      hiddenCols: [],
      colWidths: {},
      sort: { key: 'sku', dir: 'asc' },
      filter: { q: '', category: 'Alle' },
      stock: { mode: 'all', lowThreshold: 5 },
      density: 'comfort',
      selectedIds: [],
      previewEnabled: true,
      facets: emptyFacets(),
      facetUi: defaultFacetUi(),
      savedViews: createSeededViews(),
      currentViewId: null,
      sourceMode: 'store',
      sourceFilter: { store: true, network: true, catalog: true },

      setHiddenCols: (cols) => set({ hiddenCols: cols }),
      setColWidth: (colId, width) =>
        set((state) => ({
          colWidths: {
            ...state.colWidths,
            [colId]: Math.max(50, Math.round(width)),
          },
        })),
      setSort: (key, dir) => set({ sort: { key, dir }, currentViewId: null }),
      setFilter: (q, category) =>
        set((state) => ({
          filter: { q, category },
          facets: {
            ...state.facets,
            category: category === 'Alle' ? [] : [category],
          },
          currentViewId: null,
        })),
      setStock: (mode) =>
        set((s) => {
          const nextFacets = cloneFacets(s.facets);
          if (mode === 'all') {
            nextFacets.stock = [];
          } else {
            nextFacets.stock = [mode];
          }
          return {
            stock: { ...s.stock, mode },
            facets: nextFacets,
            currentViewId: null,
          };
        }),
      setLowThreshold: (n) =>
        set((s) => ({
          stock: { ...s.stock, lowThreshold: Math.max(0, Math.floor(n)) },
          currentViewId: null,
        })),
      setDensity: (d) => set({ density: d }),
      setSelected: (ids) => set({ selectedIds: ids }),
      setPreviewEnabled: (on) => set({ previewEnabled: !!on }),
      toggleFacet: (key, value) =>
        set((state) => {
          const next = cloneFacets(state.facets);
          let nextFacetUi = state.facetUi;
          switch (key) {
            case 'brand':
              next.brand = next.brand.includes(value) ? next.brand.filter((v) => v !== value) : [...next.brand, value];
              if (next.brand.length > 0 && state.facetUi.collapsed.model) {
                nextFacetUi = {
                  ...state.facetUi,
                  collapsed: { ...state.facetUi.collapsed, model: false },
                };
              }
              break;
            case 'model':
              next.model = next.model.includes(value)
                ? next.model.filter((v) => v !== value)
                : [...next.model, value];
              break;
            case 'size':
              next.size = next.size.includes(value)
                ? next.size.filter((v) => v !== value)
                : [...next.size, value];
              break;
            case 'category': {
              const val = value as InventoryCategory;
              next.category = next.category.includes(val)
                ? next.category.filter((v) => v !== val)
                : [...next.category, val];
              break;
            }
            case 'color':
              next.color = next.color.includes(value) ? next.color.filter((v) => v !== value) : [...next.color, value];
              break;
            case 'stock': {
              const val = value as InventoryStockStatus;
              next.stock = next.stock.includes(val)
                ? next.stock.filter((v) => v !== val)
                : [...next.stock, val];
              break;
            }
          }
          return {
            facets: next,
            filter: {
              ...state.filter,
              category: next.category.length === 1 ? next.category[0] : 'Alle',
            },
            currentViewId: null,
            facetUi: nextFacetUi,
          };
        }),
      clearFacet: (key) =>
        set((state) => {
          if (!key) {
            return {
              facets: emptyFacets(),
              filter: { ...state.filter, category: 'Alle' },
              currentViewId: null,
              facetUi: {
                ...state.facetUi,
                modelSearch: '',
                modelExpanded: false,
              },
            };
          }
          const next = cloneFacets(state.facets);
          if (key === 'brand') next.brand = [];
          else if (key === 'model') next.model = [];
          else if (key === 'size') next.size = [];
          else if (key === 'category') next.category = [];
          else if (key === 'color') next.color = [];
          else if (key === 'stock') next.stock = [];
          return {
            facets: next,
            filter: {
              ...state.filter,
              category: key === 'category' ? 'Alle' : state.filter.category,
            },
            currentViewId: null,
          };
        }),
      setFacetCollapsed: (key, collapsed) =>
        set((state) => ({
          facetUi: {
            ...state.facetUi,
            collapsed: { ...state.facetUi.collapsed, [key]: collapsed },
          },
        })),
      setFacetModelSearch: (query) =>
        set((state) => ({
          facetUi: {
            ...state.facetUi,
            modelSearch: query,
          },
        })),
      setFacetModelExpanded: (expanded) =>
        set((state) => ({
          facetUi: {
            ...state.facetUi,
            modelExpanded: expanded,
          },
        })),
      resetFilters: () =>
        set((state) => ({
          filter: { q: '', category: 'Alle' },
          stock: { ...state.stock, mode: 'all' },
          facets: emptyFacets(),
          facetUi: {
            ...state.facetUi,
            modelSearch: '',
            modelExpanded: false,
          },
          currentViewId: null,
        })),
      saveCurrentView: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const now = new Date().toISOString();
        let savedId: string | null = null;
        set((state) => {
          const existingEntry = Object.values(state.savedViews).find(
            (view) => !view.seeded && view.name.toLowerCase() === trimmed.toLowerCase(),
          );
          const id = existingEntry?.id ?? generateViewId(trimmed);
          savedId = id;
          const saved: FacetPreset = {
            id,
            name: trimmed,
            sort: state.sort,
            filter: state.filter,
            stock: state.stock,
            facets: cloneFacets(state.facets),
            createdAt: existingEntry?.createdAt ?? now,
            updatedAt: now,
            seeded: existingEntry?.seeded ?? false,
          };
          return {
            savedViews: {
              ...state.savedViews,
              [id]: saved,
            },
            currentViewId: id,
          };
        });
        return savedId;
      },
      applySavedView: (id) => {
        const { savedViews } = get();
        const preset = savedViews[id];
        if (!preset) return;
        set({
          sort: preset.sort,
          filter: preset.filter,
          stock: preset.stock,
          facets: cloneFacets(preset.facets),
          currentViewId: id,
        });
      },
      deleteSavedView: (id) => {
        set((state) => {
          const preset = state.savedViews[id];
          if (!preset || preset.seeded) return {};
          const { [id]: _drop, ...rest } = state.savedViews;
          const nextId = state.currentViewId === id ? null : state.currentViewId;
          return {
            savedViews: rest,
            currentViewId: nextId,
          };
        });
      },
      resetToSeededViews: () =>
        set((state) => ({
          savedViews: createSeededViews(state),
          currentViewId: null,
        })),
      setSourceMode: (mode) => set({ sourceMode: mode }),
      toggleSourceFilter: (key) =>
        set((state) => {
          const next = {
            ...state.sourceFilter,
            [key]: !state.sourceFilter[key],
          };
          const noneSelected = !next.store && !next.network && !next.catalog;
          if (noneSelected) {
            next[key] = true;
          }
          return { sourceFilter: next };
        }),
    }),
    {
      name: 'inventory-view',
      version: 6,
      migrate: (persisted, _version) => {
        const raw = (persisted ?? {}) as Partial<ViewState>;

        const sort: ViewState['sort'] =
          raw.sort && raw.sort.key && raw.sort.dir
            ? { key: raw.sort.key, dir: raw.sort.dir }
            : { key: 'sku', dir: 'asc' };

        const validCategories: Array<'Alle' | InventoryCategory> = [
          'Alle',
          'Frames',
          'Sunglasses',
          'Lenses',
          'Accessories',
        ];
        const filterCategory = validCategories.includes(raw.filter?.category as any)
          ? (raw.filter!.category as 'Alle' | InventoryCategory)
          : 'Alle';
        const filter: ViewState['filter'] = {
          q: raw.filter?.q ?? '',
          category: filterCategory,
        };

        const stockMode: StockFilter = ['all', 'in', 'low', 'out'].includes(raw.stock?.mode as StockFilter)
          ? (raw.stock!.mode as StockFilter)
          : 'all';
        const lowThresholdRaw = Number.parseInt(String(raw.stock?.lowThreshold ?? ''), 10);
        const stock: ViewState['stock'] = {
          mode: stockMode,
          lowThreshold: Number.isFinite(lowThresholdRaw) ? Math.max(0, lowThresholdRaw) : 5,
        };

        const facets = normalizeFacets(raw.facets as Partial<FacetSelections> | null);
        const facetUi = normalizeFacetUi(raw.facetUi as Partial<FacetUiState> | null);

        const baseForSaved = { sort, filter, stock };
        const savedViews = normalizeSavedViews(
          raw.savedViews as Record<string, Partial<FacetPreset>> | undefined,
          baseForSaved,
        );

        const seededDefaults = createSeededViews(baseForSaved);
        for (const [id, preset] of Object.entries(seededDefaults)) {
          if (!savedViews[id]) savedViews[id] = preset;
        }

        const currentViewId = raw.currentViewId && savedViews[raw.currentViewId] ? raw.currentViewId : null;

        const sourceModes: SourceMode[] = ['store', 'network', 'catalog', 'all'];
        const sourceMode: SourceMode = sourceModes.includes(raw.sourceMode as SourceMode)
          ? (raw.sourceMode as SourceMode)
          : 'store';

        const sourceFilterRaw = raw.sourceFilter as Partial<ViewState['sourceFilter']> | undefined;
        const sourceFilter = {
          store: sourceFilterRaw?.store !== false,
          network: sourceFilterRaw?.network !== false,
          catalog: sourceFilterRaw?.catalog !== false,
        };

        return {
          hiddenCols: Array.isArray(raw.hiddenCols) ? raw.hiddenCols : [],
          colWidths: typeof raw.colWidths === 'object' && raw.colWidths ? raw.colWidths : {},
          sort,
          filter,
          stock,
          density: raw.density === 'compact' ? 'compact' : 'comfort',
          selectedIds: Array.isArray(raw.selectedIds) ? raw.selectedIds : [],
          previewEnabled: raw.previewEnabled ?? true,
          facets,
          facetUi,
          savedViews,
          currentViewId,
          sourceMode,
          sourceFilter,
        } as ViewState;
      },
    },
  ),
);
