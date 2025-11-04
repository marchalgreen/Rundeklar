// src/lib/catalog/toInventoryRows.ts
import type {
  AccessoryVariant,
  CatalogProduct,
  ContactVariant,
  FrameVariant,
  LensVariant,
} from '@/types/product';
import { frameVariantSizeLabel } from '@/types/product';
import type { InventoryItem } from '@/store/inventory';

export type CatalogRow = InventoryItem & {
  source: 'Catalog';
  sourceLabel: 'Katalog';
  catalogId: string;
  variantId?: string;
  catalogUrl?: string;
};

const SOURCE_LABEL: CatalogRow['sourceLabel'] = 'Katalog';

type Variant =
  | FrameVariant
  | AccessoryVariant
  | LensVariant
  | ContactVariant
  | undefined;

function toInventoryCategory(
  product: CatalogProduct,
  variant: Variant,
): InventoryItem['category'] {
  switch (product.category) {
    case 'Frames': {
      const usage = (variant as FrameVariant | undefined)?.usage;
      if (usage === 'sun') return 'Sunglasses';
      return 'Frames';
    }
    case 'Accessories':
      return 'Accessories';
    case 'Lenses':
    case 'Contacts':
      return 'Lenses';
    default:
      return 'Frames';
  }
}

function variantColor(variant: Variant): string | undefined {
  if (!variant) return undefined;
  if ('color' in variant) {
    const maybeColor = (variant as FrameVariant | AccessoryVariant).color;
    return maybeColor?.name ?? undefined;
  }
  return undefined;
}

function normalizeSizeLabel(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function variantSizeLabel(product: CatalogProduct, variant: Variant): string | undefined {
  if (!variant) return undefined;
  if (product.category === 'Frames') {
    const v = variant as FrameVariant;
    const raw = v.sizeLabel ?? frameVariantSizeLabel(v) ?? undefined;
    return normalizeSizeLabel(raw);
  }
  if (product.category === 'Accessories') {
    const v = variant as AccessoryVariant;
    return normalizeSizeLabel(v.sizeLabel);
  }
  return undefined;
}

function variantUsage(product: CatalogProduct, variant: Variant): InventoryItem['usage'] | undefined {
  if (product.category === 'Frames') {
    return (variant as FrameVariant | undefined)?.usage;
  }
  if (product.category === 'Lenses' || product.category === 'Contacts') {
    return 'optical';
  }
  return undefined;
}

function variantBarcode(product: CatalogProduct, variant: Variant): string | undefined {
  if (!variant) return undefined;
  if (product.category === 'Frames') return (variant as FrameVariant).barcode;
  if (product.category === 'Accessories') return (variant as AccessoryVariant).barcode;
  if (product.category === 'Lenses') return (variant as LensVariant).barcode;
  if (product.category === 'Contacts') return (variant as ContactVariant).barcode;
  return undefined;
}

function buildName(
  product: CatalogProduct,
  variant: Variant,
  color?: string,
  sizeLabel?: string,
): string {
  const base =
    product.name?.trim() ||
    [product.brand, product.model].filter(Boolean).join(' ').trim() ||
    product.catalogId;

  const extras = [color, sizeLabel].filter((part) => part && part.trim().length > 0) as string[];
  if (extras.length === 0) return base;
  const suffix = extras.join(' · ');
  if (base.includes(suffix)) return base;
  return `${base} — ${suffix}`;
}

function stableSku(product: CatalogProduct, variant: Variant, fallbackIndex: number): string {
  const rawSku =
    (variant && 'sku' in variant ? (variant as FrameVariant | AccessoryVariant | LensVariant | ContactVariant).sku : undefined) ||
    (product as any).sku ||
    product.catalogId;

  const trimmed = rawSku?.toString().trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return `${product.catalogId}-${fallbackIndex + 1}`;
}

/**
 * Maps vendor catalog products into Inventory-like rows (read-only, qty=0).
 * Generates a row for every variant with a stable id/sku and source metadata.
 */
export function mapCatalogToRows(products: CatalogProduct[], limit = 400): CatalogRow[] {
  if (!Array.isArray(products) || products.length === 0) return [];

  const rows: CatalogRow[] = [];
  const seenSkus = new Set<string>();

  outer: for (let i = 0; i < products.length && rows.length < limit; i++) {
    const product = products[i];
    const variants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [undefined];

    for (let vIdx = 0; vIdx < variants.length && rows.length < limit; vIdx++) {
      const variant = variants[vIdx] as Variant;
      const sku = stableSku(product, variant, vIdx);
      const skuKey = sku.toLowerCase();
      if (seenSkus.has(skuKey)) continue;
      seenSkus.add(skuKey);

      const color = variantColor(variant);
      const sizeLabel = variantSizeLabel(product, variant);
      const usage = variantUsage(product, variant);
      const barcode = variantBarcode(product, variant);
      const category = toInventoryCategory(product, variant);
      const name = buildName(product, variant, color, sizeLabel);

      rows.push({
        id: `catalog:${product.catalogId}:${variant ? (variant as any).id ?? vIdx : 'base'}`,
        catalogId: product.catalogId,
        variantId: variant ? ((variant as any).id as string | undefined) ?? undefined : undefined,
        sku,
        name,
        category,
        qty: 0,
        updatedAt: product.source?.lastSyncISO || '',
        barcode,
        brand: product.brand,
        model: product.model,
        color,
        sizeLabel,
        usage,
        source: 'Catalog',
        sourceLabel: SOURCE_LABEL,
        catalogUrl: product.source?.url,
      });

      if (rows.length >= limit) break outer;
    }
  }

  return rows;
}
