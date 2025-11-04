import type { InventoryItem } from '@/store/inventory';
import type { FacetKey, FacetSelections } from '@/store/inventoryView';

export type InventoryStockStatus = 'in' | 'low' | 'out';

function normalizeFacetValue(raw: string | undefined): string {
  if (!raw) return 'Other';
  const cleaned = raw
    .replace(/[®™]/g, '')
    .replace(/\s+\d+mm$/i, '')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s+\(.*?\)$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned) return 'Other';
  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
    .replace(/-([a-z])/g, (_, ch: string) => `-${ch.toUpperCase()}`);
}

function normalizedColorValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = normalizeFacetValue(raw);
  if (/^\d{2}$/.test(cleaned)) return 'Unknown';
  return cleaned;
}

export function deriveBrand(item: InventoryItem): string {
  if (item.brand) return normalizeFacetValue(item.brand);
  const name = (item.name ?? '').trim();
  if (!name) return 'Other';
  const primary = name.split('—')[0] ?? name;
  const cleaned = primary.replace(/\(.*?\)/g, '').trim();
  const firstWord = cleaned.split(/\s+/)[0];
  return normalizeFacetValue(firstWord);
}

export function deriveModel(item: InventoryItem): string {
  if (item.model) return normalizeFacetValue(item.model);
  const name = (item.name ?? '').trim();
  if (!name) return 'Other';
  const primary = name.split('—')[0] ?? name;
  const cleaned = primary.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length <= 1) return 'Other';
  return normalizeFacetValue(parts.slice(1).join(' '));
}

export function deriveColor(item: InventoryItem): string {
  const direct = normalizedColorValue(item.color);
  if (direct) return direct;
  return 'Standard';
}

function normalizeSizeLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 2) return digits;
  if (digits.length > 2) return digits.slice(0, 2);
  return null;
}

export function deriveSizeLabel(item: InventoryItem): string {
  const primary = normalizeSizeLabel(item.sizeLabel);
  if (primary) return primary;

  const nameDigits = normalizeSizeLabel(item.name?.match(/\b(\d{2})\b/)?.[1]);
  if (nameDigits) return nameDigits;

  return '—';
}

export function getStockStatus(item: InventoryItem, lowThreshold: number): InventoryStockStatus {
  if (!item || typeof item.qty !== 'number') return 'out';
  if (item.qty <= 0) return 'out';
  if (item.qty <= Math.max(0, lowThreshold)) return 'low';
  return 'in';
}

export const STOCK_STATUS_LABELS: Record<InventoryStockStatus, string> = {
  in: 'På lager',
  low: 'Lavt',
  out: 'Udsolgt',
};

type FacetMeta = {
  brand: string;
  model: string;
  size: string;
  category: InventoryItem['category'];
  color: string;
  stock: InventoryStockStatus;
};

export type FacetCountMap = Record<FacetKey, Map<string, number>>;

export interface FacetCountEntry {
  value: string;
  count: number;
}

interface FacetCountOptions {
  items: InventoryItem[];
  facets: FacetSelections;
  lowThreshold: number;
  knownCategories?: InventoryItem['category'][];
}

function getMetaForItem(item: InventoryItem, lowThreshold: number): FacetMeta {
  return {
    brand: deriveBrand(item),
    model: deriveModel(item),
    size: deriveSizeLabel(item),
    category: item.category,
    color: deriveColor(item),
    stock: getStockStatus(item, lowThreshold),
  };
}

function matchesFacets(meta: FacetMeta, facets: FacetSelections, exclude?: FacetKey): boolean {
  const f = {
    brand: Array.isArray(facets.brand) ? facets.brand : [],
    model: Array.isArray(facets.model) ? facets.model : [],
    size: Array.isArray(facets.size) ? facets.size : [],
    category: Array.isArray(facets.category) ? facets.category : [],
    color: Array.isArray(facets.color) ? facets.color : [],
    stock: Array.isArray(facets.stock) ? facets.stock : [],
  } as FacetSelections;
  if (exclude !== 'brand' && f.brand.length && !f.brand.includes(meta.brand)) return false;
  if (exclude !== 'model' && f.model.length && !f.model.includes(meta.model)) return false;
  if (exclude !== 'size' && f.size.length && !f.size.includes(meta.size)) return false;
  if (exclude !== 'category' && f.category.length && !f.category.includes(meta.category)) return false;
  if (exclude !== 'color' && f.color.length && !f.color.includes(meta.color)) return false;
  if (exclude !== 'stock' && f.stock.length && !f.stock.includes(meta.stock)) return false;
  return true;
}

function getFacetValue(meta: FacetMeta, key: FacetKey): string {
  switch (key) {
    case 'brand':
      return meta.brand;
    case 'model':
      return meta.model;
    case 'size':
      return meta.size;
    case 'category':
      return meta.category;
    case 'color':
      return meta.color;
    case 'stock':
      return meta.stock;
    default:
      return '';
  }
}

function ensureActiveValues(map: Map<string, number>, activeValues: readonly string[]): void {
  for (const value of activeValues) {
    if (!map.has(value)) {
      map.set(value, 0);
    }
  }
}

export function getFacetCounts({
  items,
  facets,
  lowThreshold,
  knownCategories = [],
}: FacetCountOptions): FacetCountMap {
  const normalized: FacetSelections = {
    brand: Array.isArray(facets.brand) ? facets.brand : [],
    model: Array.isArray(facets.model) ? facets.model : [],
    size: Array.isArray(facets.size) ? facets.size : [],
    category: Array.isArray(facets.category) ? facets.category : [],
    color: Array.isArray(facets.color) ? facets.color : [],
    stock: Array.isArray(facets.stock) ? facets.stock : [],
  } as FacetSelections;
  const counts: FacetCountMap = {
    brand: new Map<string, number>(),
    model: new Map<string, number>(),
    size: new Map<string, number>(),
    category: new Map<string, number>(),
    color: new Map<string, number>(),
    stock: new Map<string, number>([
      ['in', 0],
      ['low', 0],
      ['out', 0],
    ]),
  };

  knownCategories.forEach((category) => {
    if (!counts.category.has(category)) counts.category.set(category, 0);
  });

  const keys: FacetKey[] = ['brand', 'model', 'size', 'category', 'color', 'stock'];

  for (const item of items) {
    const meta = getMetaForItem(item, lowThreshold);
    for (const key of keys) {
      if (!matchesFacets(meta, normalized, key)) continue;
      const value = getFacetValue(meta, key);
      if (!value) continue;
      const map = counts[key];
      map.set(value, (map.get(value) ?? 0) + 1);
    }
  }

  ensureActiveValues(counts.brand, normalized.brand);
  ensureActiveValues(counts.model, normalized.model);
  ensureActiveValues(counts.size, normalized.size);
  ensureActiveValues(
    counts.category,
    normalized.category.length ? normalized.category : (knownCategories as string[]),
  );
  ensureActiveValues(counts.color, normalized.color);
  ensureActiveValues(counts.stock, normalized.stock);

  return counts;
}

function sortFacetEntries(
  entries: FacetCountEntry[],
  activeValues: readonly string[],
): FacetCountEntry[] {
  const activeSet = new Set(activeValues);
  return entries
    .slice()
    .sort((a, b) => {
      const aActive = activeSet.has(a.value);
      const bActive = activeSet.has(b.value);
      if (aActive !== bActive) return aActive ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.value.localeCompare(b.value, 'da');
    });
}

export function getBrands(counts: FacetCountMap, active: readonly string[] = []): FacetCountEntry[] {
  const options = Array.from(counts.brand.entries()).map(([value, count]) => ({ value, count }));
  const filtered = options.filter((entry) => entry.count > 0 || active.includes(entry.value));
  return sortFacetEntries(filtered, active);
}

interface ModelOptionsConfig {
  active?: readonly string[];
  search?: string;
}

export function getModels(
  counts: FacetCountMap,
  { active = [], search }: ModelOptionsConfig = {},
): FacetCountEntry[] {
  const query = search?.trim().toLowerCase();
  const options = Array.from(counts.model.entries()).map(([value, count]) => ({ value, count }));
  const filtered = options.filter((entry) => {
    if (entry.count === 0 && !active.includes(entry.value)) return false;
    if (!query) return true;
    return entry.value.toLowerCase().includes(query);
  });
  const activeSet = new Set(active);
  return filtered
    .slice()
    .sort((a, b) => {
      const aActive = activeSet.has(a.value);
      const bActive = activeSet.has(b.value);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return a.value.localeCompare(b.value, 'da', { sensitivity: 'accent' });
    });
}

export function getSizes(counts: FacetCountMap, active: readonly string[] = []): FacetCountEntry[] {
  const options = Array.from(counts.size.entries()).map(([value, count]) => ({ value, count }));
  const filtered = options.filter((entry) => entry.count > 0 || active.includes(entry.value));
  const activeSet = new Set(active);
  return filtered.sort((a, b) => {
    const aActive = activeSet.has(a.value);
    const bActive = activeSet.has(b.value);
    if (aActive !== bActive) return aActive ? -1 : 1;
    const ai = Number.parseInt(a.value, 10);
    const bi = Number.parseInt(b.value, 10);
    const aNum = Number.isFinite(ai);
    const bNum = Number.isFinite(bi);
    if (aNum && bNum) return ai - bi;
    if (aNum !== bNum) return aNum ? -1 : 1;
    return a.value.localeCompare(b.value, 'da');
  });
}
