import Fuse from 'fuse.js';
import type { InventoryItem } from '@/store/inventory';
import { deriveBrand, deriveModel } from '@/lib/inventoryFacets';

export function makeInventoryFuse(items: InventoryItem[]) {
  return new Fuse(items, {
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.3,
    getFn: (item, path) => {
      if (Array.isArray(path)) {
        return path.map((segment) => {
          if (segment === 'brand') return deriveBrand(item as InventoryItem);
          if (segment === 'model') return deriveModel(item as InventoryItem);
          return (item as any)[segment];
        });
      }
      if (path === 'brand') return deriveBrand(item as InventoryItem);
      if (path === 'model') return deriveModel(item as InventoryItem);
      return (item as any)[path];
    },
    keys: [
      { name: 'name', weight: 0.35 },
      { name: 'brand', weight: 0.2 },
      { name: 'model', weight: 0.15 },
      { name: 'sku', weight: 0.2 },
      { name: 'barcode', weight: 0.1 },
    ],
  });
}

export function fuzzyFilter(items: InventoryItem[], q: string): InventoryItem[] {
  const query = q.trim();
  if (!query) return items;
  const fuse = makeInventoryFuse(items);
  return fuse.search(query).map((r) => r.item);
}

/**
 * Cross-source fuzzy filter for "All" mode.
 * Scans name, sku, category, and source label.
 */
type SourceAware = {
  name?: string;
  sku?: string;
  category?: string;
  brand?: string;
  model?: string;
  source?: string;
  sourceLabel?: string;
};

const SOURCE_LABEL_LOOKUP: Record<string, string> = {
  Store: 'Butik',
  store: 'Butik',
  Network: 'Kæde',
  network: 'Kæde',
  Catalog: 'Katalog',
  catalog: 'Katalog',
};

function decorateForSourceSearch<T extends SourceAware>(list: T[]) {
  return list.map((item) => {
    const isInventory =
      item &&
      typeof item === 'object' &&
      'sku' in item &&
      'qty' in item &&
      'id' in item &&
      'updatedAt' in item;
    const brand = item.brand || (isInventory ? deriveBrand(item as InventoryItem) : undefined);
    const model = item.model || (isInventory ? deriveModel(item as InventoryItem) : undefined);
    const sourceLabel =
      item.sourceLabel ||
      (item.source ? SOURCE_LABEL_LOOKUP[item.source] ?? item.source : undefined);

    return {
      original: item,
      name: item.name ?? '',
      sku: item.sku ?? '',
      category: item.category ?? '',
      brand: brand ?? '',
      model: model ?? '',
      sourceLabel: sourceLabel ?? '',
    };
  });
}

export function fuzzyFilterWithSource<T extends SourceAware>(list: T[], q: string) {
  const query = q.trim();
  if (!query) return list;

  const decorated = decorateForSourceSearch(list);
  const fuse = new Fuse(decorated, {
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.32,
    keys: [
      { name: 'name', weight: 0.3 },
      { name: 'brand', weight: 0.2 },
      { name: 'model', weight: 0.15 },
      { name: 'sku', weight: 0.2 },
      { name: 'category', weight: 0.1 },
      { name: 'sourceLabel', weight: 0.05 },
    ],
  });

  return fuse.search(query).map((res) => res.item.original as T);
}
