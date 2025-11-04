// src/store/catalog.ts
'use client';

import { create } from 'zustand';
import type {
  CatalogProduct,
  CatalogPhoto,
  CatalogSource,
  ProductCategory,
  FrameVariant,
} from '@/types/product';

/**
 * Catalog store that loads MOSCOT products from our API once and caches them.
 * - getBySku: finds a product by product SKU or variant SKU (case-insensitive)
 * - refresh: marks a product "verified" and updates lastSync timestamp (local)
 * - unlink: mark "unlinked"
 * - link: force catalogId and mark "verified"
 */

type Index = {
  bySku: Map<string, CatalogProduct>; // product sku → product
  byVariantSku: Map<string, CatalogProduct>; // variant sku → owning product
  byHandle: Map<string, CatalogProduct>; // catalog handle → product
  loadedAtISO?: string;
  sourcePath?: string;
};

type CatalogState = {
  index?: Index;
  loading: boolean;
  error?: string;

  ensureLoaded: () => Promise<void>;
  getBySku: (sku: string, categoryHint?: ProductCategory) => CatalogProduct | undefined;
  getAll: () => CatalogProduct[];
  refresh: (sku: string) => void;
  unlink: (sku: string) => void;
  link: (sku: string, catalogId: string) => void;
};

export const useCatalog = create<CatalogState>((set, get) => ({
  index: undefined,
  loading: false,
  error: undefined,

  ensureLoaded: () => {
    const s = get();
    if (s.index || s.loading) return Promise.resolve();

    return new Promise<void>((resolve) => {
      queueMicrotask(async () => {
        const s2 = get();
        if (s2.index || s2.loading) {
          resolve();
          return;
        }
        set({ loading: true, error: undefined });
        try {
          const res = await fetch('/api/catalog/moscot', { cache: 'no-store' });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.error || res.statusText);
          }
          const { products, sourcePath } = await res.json();
          const idx = buildIndex(products as CatalogProduct[], sourcePath);
          set({ index: idx, loading: false });
        } catch (err: any) {
          set({ loading: false, error: String(err?.message || err) });
        } finally {
          resolve();
        }
      });
    });
  },

  getBySku: (sku, _hint) => {
    const needle = (sku || '').trim();
    if (!needle) return undefined;

    // Auto-load if needed (fire and forget)
    void get().ensureLoaded();

    const idx = get().index;
    if (!idx) return undefined;

    const key = needle.toLowerCase();
    // product-level SKU?
    const p = idx.bySku.get(key);
    if (p) return p;
    // variant-level SKU?
    const variantProduct = idx.byVariantSku.get(key);
    if (variantProduct) return variantProduct;

    // fallback: try direct handle match (full key) or first segment before hyphen
    const handleProduct = idx.byHandle.get(key);
    if (handleProduct) return handleProduct;

    const handleKey = key.split('-')[0];
    if (handleKey) {
      return idx.byHandle.get(handleKey) ?? undefined;
    }
    return undefined;
  },

  refresh: (sku) => {
    const idx = get().index;
    if (!idx) return;
    const key = sku.toLowerCase();
    const p = idx.bySku.get(key) || idx.byVariantSku.get(key);
    if (!p) return;

    const src: CatalogSource = {
      ...p.source,
      lastSyncISO: new Date().toISOString(),
      confidence: 'verified',
    };
    const updated: CatalogProduct = { ...p, source: src };
    mutateProductInIndex(idx, p, updated);
    set({ index: { ...idx } });
  },

  unlink: (sku) => {
    const idx = get().index;
    if (!idx) return;
    const key = sku.toLowerCase();
    const p = idx.bySku.get(key) || idx.byVariantSku.get(key);
    if (!p) return;

    const src: CatalogSource = { ...p.source, confidence: 'unlinked' };
    const updated: CatalogProduct = { ...p, source: src };
    mutateProductInIndex(idx, p, updated);
    set({ index: { ...idx } });
  },

  link: (sku, catalogId) => {
    const idx = get().index;
    if (!idx) return;
    const key = sku.toLowerCase();
    const p = idx.bySku.get(key) || idx.byVariantSku.get(key);
    if (!p) return;

    const src: CatalogSource = {
      ...p.source,
      confidence: 'verified',
      lastSyncISO: new Date().toISOString(),
    };
    const updated: CatalogProduct = { ...p, catalogId, source: src };
    mutateProductInIndex(idx, p, updated);
    set({ index: { ...idx } });
  },

  getAll: () => {
    // Auto-load if needed; caller can also await ensureLoaded
    void get().ensureLoaded();

    const idx = get().index;
    if (!idx) return [];

    // Combine products referenced by SKU and variant maps, ensuring uniqueness via Set
    const unique = new Set<CatalogProduct>();
    idx.bySku.forEach((product) => unique.add(product));
    idx.byVariantSku.forEach((product) => unique.add(product));
    return Array.from(unique);
  },
}));

/* ---------------- helpers ---------------- */

function buildIndex(products: CatalogProduct[], sourcePath?: string): Index {
  const bySku = new Map<string, CatalogProduct>();
  const byVariantSku = new Map<string, CatalogProduct>();
  const byHandle = new Map<string, CatalogProduct>();

  const registerHandle = (handle: string | undefined, product: CatalogProduct) => {
    if (!handle) return;
    const norm = handle.trim().toLowerCase();
    if (!norm) return;
    if (!byHandle.has(norm)) byHandle.set(norm, product);
  };

  for (const p of products) {
    // product-level sku: pick a stable SKU if present (some scrapers use handle)
    // Heuristic: variant sku may be more present; still allow product.sku in specs.
    const topSku = normalizeSku((p as any).sku || p.catalogId);
    if (topSku) bySku.set(topSku, p);

    registerHandle(p.catalogId, p);
    const primaryHandle = (p.catalogId || '').split('-')[0];
    registerHandle(primaryHandle, p);

    // index variants
    if (Array.isArray(p.variants)) {
      for (const v of p.variants as any[]) {
        const vs = normalizeSku(v.sku);
        if (vs) byVariantSku.set(vs, p);

        const variantHandle = typeof v?.sku === 'string' ? v.sku.split('-')[0] : undefined;
        registerHandle(variantHandle, p);
      }
    }
  }

  return { bySku, byVariantSku, byHandle, loadedAtISO: new Date().toISOString(), sourcePath };
}

function normalizeSku(s?: string) {
  if (!s) return '';
  return String(s).trim().toLowerCase();
}

/** replace product object in both maps */
function mutateProductInIndex(idx: Index, oldP: CatalogProduct, newP: CatalogProduct) {
  // mutate product-level map
  for (const [k, p] of idx.bySku.entries()) {
    if (p === oldP) idx.bySku.set(k, newP);
  }
  // mutate variant-level map
  for (const [k, p] of idx.byVariantSku.entries()) {
    if (p === oldP) idx.byVariantSku.set(k, newP);
  }
  // mutate handle-level map
  for (const [k, p] of idx.byHandle.entries()) {
    if (p === oldP) idx.byHandle.set(k, newP);
  }
}
