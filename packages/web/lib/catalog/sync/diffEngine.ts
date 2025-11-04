import { createHash } from 'node:crypto';

import type { Product, StoreStock, VendorCatalogItem } from '@prisma/client';
import { ProductCategory } from '@prisma/client';

import type { NormalizedProduct } from '@/lib/catalog/normalization/types';

export type ProductSnapshot = {
  id: string | null;
  sku: string;
  name: string;
  category: ProductCategory;
  brand: string | null;
  model: string | null;
  color: string | null;
  sizeLabel: string | null;
  usage: string | null;
  catalogUrl: string | null;
  supplier: string | null;
};

export type StockChange = {
  storeStockId: string;
  storeId: string;
  before: { qty: number; barcode: string | null };
  after: { qty: number; barcode: string | null };
  changed: boolean;
};

export type DiffItem = {
  catalogId: string;
  catalogItemId: string | null;
  existingHash: string | null;
  hash: string;
  normalized: NormalizedProduct;
  productBefore: ProductSnapshot | null;
  productAfter: ProductSnapshot;
  productChanges: Array<{ field: keyof ProductSnapshot; before: unknown; after: unknown }>;
  stockChanges: StockChange[];
  status: 'new' | 'updated' | 'unchanged';
};

export type RemovedItem = {
  catalogId: string;
  catalogItemId: string | null;
  productId: string | null;
  sku: string | null;
  stocks: Array<{ storeStockId: string; storeId: string; qty: number; barcode: string | null }>;
};

export type DiffCounts = {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
};

export type DiffResult = {
  vendor: string;
  hash: string;
  counts: DiffCounts;
  items: DiffItem[];
  removed: RemovedItem[];
};

export type DiffEngineInput = {
  vendor: string;
  normalized: NormalizedProduct[];
  existingCatalogItems: VendorCatalogItem[];
  existingProducts: Array<Product & { stocks: StoreStock[] }>;
};

const ProductFields: Array<keyof ProductSnapshot> = [
  'sku',
  'name',
  'category',
  'brand',
  'model',
  'color',
  'sizeLabel',
  'usage',
  'catalogUrl',
  'supplier',
];

function normalizeSku(vendor: string, catalogId: string) {
  const trimmedCatalogId = catalogId.trim();
  const trimmedVendor = vendor.trim();
  if (!trimmedVendor) return trimmedCatalogId;
  return `${trimmedVendor}:${trimmedCatalogId}`;
}

function extractCatalogId(vendor: string, sku: string | null | undefined): string | null {
  if (!sku) return null;
  const normalized = sku.trim();
  if (!normalized) return null;
  const prefix = `${vendor}:`;
  if (normalized.startsWith(prefix)) {
    return normalized.slice(prefix.length);
  }
  return normalized;
}

function ensureString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function toProductCategory(value: string): ProductCategory {
  if ((ProductCategory as Record<string, string>)[value]) {
    return value as ProductCategory;
  }
  // Default fallback for unknown categories
  return ProductCategory.Accessories;
}

function buildProductSnapshotFromNormalized(
  vendor: string,
  normalized: NormalizedProduct,
): ProductSnapshot {
  const firstVariant = normalized.variants[0] ?? null;
  const color = firstVariant && 'color' in firstVariant ? ensureString(firstVariant.color?.name) : null;
  const sizeLabel = firstVariant && 'sizeLabel' in firstVariant ? ensureString(firstVariant.sizeLabel) : null;
  const usage =
    firstVariant && 'usage' in firstVariant && typeof firstVariant.usage === 'string'
      ? ensureString(firstVariant.usage)
      : null;
  return {
    id: null,
    sku: normalizeSku(vendor, normalized.catalogId),
    name: ensureString(normalized.name) ?? ensureString(normalized.model) ?? normalized.catalogId,
    category: toProductCategory(normalized.category),
    brand: ensureString(normalized.brand) ?? ensureString(normalized.vendor.name) ?? normalized.vendor.slug,
    model: ensureString(normalized.model),
    color,
    sizeLabel,
    usage,
    catalogUrl: ensureString(normalized.source?.url),
    supplier: ensureString(normalized.vendor.name) ?? normalized.vendor.slug,
  } satisfies ProductSnapshot & { id: null };
}

function buildProductSnapshotFromExisting(product: Product): ProductSnapshot {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    brand: product.brand ?? null,
    model: product.model ?? null,
    color: product.color ?? null,
    sizeLabel: product.sizeLabel ?? null,
    usage: product.usage ?? null,
    catalogUrl: product.catalogUrl ?? null,
    supplier: product.supplier ?? null,
  };
}

function diffProductSnapshots(
  before: ProductSnapshot | null,
  after: ProductSnapshot,
): Array<{ field: keyof ProductSnapshot; before: unknown; after: unknown }> {
  if (!before) return [];
  const changes: Array<{ field: keyof ProductSnapshot; before: unknown; after: unknown }> = [];
  for (const field of ProductFields) {
    if (before[field] !== after[field]) {
      changes.push({ field, before: before[field], after: after[field] });
    }
  }
  return changes;
}

function buildStockChanges(
  normalized: NormalizedProduct,
  stocks: StoreStock[],
): StockChange[] {
  if (!stocks || stocks.length === 0) return [];
  const firstVariant = normalized.variants[0] ?? null;
  const barcode =
    firstVariant && 'barcode' in firstVariant && typeof firstVariant.barcode === 'string'
      ? ensureString(firstVariant.barcode)
      : null;
  const targetQty = normalized.variants.length;

  return stocks.map((stock) => {
    const after = { qty: targetQty, barcode };
    const before = { qty: stock.qty, barcode: stock.barcode ?? null };
    const changed = before.qty !== after.qty || before.barcode !== after.barcode;
    return {
      storeStockId: stock.id,
      storeId: stock.storeId,
      before,
      after,
      changed,
    } satisfies StockChange;
  });
}

function hashNormalizedProduct(normalized: NormalizedProduct): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

function aggregateHash(entries: DiffItem[]): string {
  if (entries.length === 0) return '';
  const hash = createHash('sha256');
  const sorted = [...entries].sort((a, b) => a.catalogId.localeCompare(b.catalogId));
  for (const entry of sorted) {
    hash.update(entry.catalogId);
    hash.update(':');
    hash.update(entry.hash);
    hash.update('|');
  }
  return hash.digest('hex');
}

export function snapshotToProductData(snapshot: ProductSnapshot) {
  return {
    sku: snapshot.sku,
    name: snapshot.name,
    category: snapshot.category,
    brand: snapshot.brand,
    model: snapshot.model,
    color: snapshot.color,
    sizeLabel: snapshot.sizeLabel,
    usage: snapshot.usage,
    catalogUrl: snapshot.catalogUrl,
    supplier: snapshot.supplier,
  };
}

export function computeDiff(input: DiffEngineInput): DiffResult {
  const { vendor } = input;
  const catalogItemsByCatalog = new Map<string, VendorCatalogItem>();
  for (const item of input.existingCatalogItems) {
    catalogItemsByCatalog.set(item.catalogId, item);
  }

  const productsByCatalog = new Map<string, Product & { stocks: StoreStock[] }>();
  for (const product of input.existingProducts) {
    const catalogId = extractCatalogId(vendor, product.sku);
    if (!catalogId) continue;
    productsByCatalog.set(catalogId, product);
  }

  const items: DiffItem[] = [];
  const seenCatalogIds = new Set<string>();

  for (const normalized of input.normalized) {
    const catalogId = normalized.catalogId;
    seenCatalogIds.add(catalogId);

    const existingCatalog = catalogItemsByCatalog.get(catalogId) ?? null;
    const existingProduct = productsByCatalog.get(catalogId) ?? null;

    const productAfter = buildProductSnapshotFromNormalized(vendor, normalized);
    if (existingProduct) {
      productAfter.id = existingProduct.id;
    }
    const productBefore = existingProduct ? buildProductSnapshotFromExisting(existingProduct) : null;
    const productChanges = diffProductSnapshots(productBefore, productAfter);
    const stockChanges = buildStockChanges(normalized, existingProduct?.stocks ?? []);
    const newHash = hashNormalizedProduct(normalized);

    let status: DiffItem['status'];
    if (!existingProduct) {
      status = 'new';
    } else if (
      productChanges.length === 0 &&
      stockChanges.every((change) => !change.changed) &&
      existingCatalog?.hash === newHash
    ) {
      status = 'unchanged';
    } else {
      status = 'updated';
    }

    items.push({
      catalogId,
      catalogItemId: existingCatalog?.id ?? null,
      existingHash: existingCatalog?.hash ?? null,
      hash: newHash,
      normalized,
      productBefore,
      productAfter,
      productChanges,
      stockChanges,
      status,
    });
  }

  const removed: RemovedItem[] = [];
  for (const [catalogId, product] of productsByCatalog.entries()) {
    if (seenCatalogIds.has(catalogId)) continue;
    const catalogItem = catalogItemsByCatalog.get(catalogId) ?? null;
    removed.push({
      catalogId,
      catalogItemId: catalogItem?.id ?? null,
      productId: product.id,
      sku: product.sku,
      stocks: (product.stocks ?? []).map((stock: any) => ({
        storeStockId: stock.id,
        storeId: stock.storeId,
        qty: stock.qty,
        barcode: stock.barcode ?? null,
      })),
    });
  }

  const counts: DiffCounts = {
    total: input.normalized.length,
    created: items.filter((item) => item.status === 'new').length,
    updated: items.filter((item) => item.status === 'updated').length,
    unchanged: items.filter((item) => item.status === 'unchanged').length,
    removed: removed.length,
  };

  const hash = aggregateHash(items);

  return {
    vendor,
    hash,
    counts,
    items,
    removed,
  };
}

