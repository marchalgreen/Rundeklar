import { z } from 'zod';

import {
  NormalizedPhotoAngleSchema,
  NormalizedPhotoSchema,
  NormalizedUsageSchema,
} from '@/lib/catalog/normalizationSchemas';
import type {
  NormalizedAccessoryVariant,
  NormalizedFrameVariant,
  NormalizedProduct,
  NormalizedVariant,
  NormalizationAdapter,
} from '@/lib/catalog/normalization/types';
import { DEFAULT_VENDOR_NAME, DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

// ----------------------------------------------------------------------------
// Raw schemas (tolerant) + inferred types
// ----------------------------------------------------------------------------

const MoscotVariantSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    sizeLabel: z.string().optional(),
    fit: z.string().optional(),
    usage: z.string().optional(),
    polarized: z.boolean().optional(),
    clipCompatible: z.boolean().optional(),
    packSize: z.number().optional(),
    notes: z.string().optional(),
    measurements: z
      .object({
        lensWidth: z.number().optional(),
        lensHeight: z.number().optional(),
        frameWidth: z.number().optional(),
        bridge: z.number().optional(),
        temple: z.number().optional(),
      })
      .partial()
      .optional(),
    size: z
      .object({
        lens: z.number().optional(),
        bridge: z.number().optional(),
        temple: z.number().optional(),
      })
      .partial()
      .optional(),
    color: z
      .object({
        name: z.string().optional(),
        swatch: z.string().optional(),
        finish: z.string().optional(),
      })
      .partial()
      .optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const MoscotPhotoSchema = z
  .object({
    url: z.string().url(),
    label: z.string().optional(),
    isHero: z.boolean().optional(),
    source: z.string().optional(),
    angle: z.string().optional(),
    colorwayName: z.string().optional(),
  })
  .passthrough();

const MoscotSourceSchema = z
  .object({
    supplier: z.string().optional(),
    url: z.string().url().optional(),
    lastSyncISO: z.string().optional(),
    confidence: z.string().optional(),
  })
  .passthrough()
  .optional();

const MoscotPriceSchema = z
  .object({
    amount: z.number(),
    currency: z.string(),
  })
  .partial()
  .optional();

const MoscotRawProductSchema = z
  .object({
    catalogId: z.string().min(1),
    category: z.string().min(1),
    brand: z.string().optional(),
    model: z.string().optional(),
    name: z.string().optional(),
    collections: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    storyHtml: z.string().optional(),
    descriptionHtml: z.string().optional(),
    photos: z.array(MoscotPhotoSchema).optional(),
    source: MoscotSourceSchema,
    price: MoscotPriceSchema,
    variants: z.array(MoscotVariantSchema).optional(),
  })
  .passthrough();

export type MoscotRawProduct = z.infer<typeof MoscotRawProductSchema>;
type MoscotVariant = z.infer<typeof MoscotVariantSchema>;

// ---- Adapter input that ALSO accepts readonly arrays (to match test fixtures)
// (explicitly re-state the important fields to avoid `unknown` leaks)
type MoscotAdapterInput = {
  catalogId: string;
  category: string;
  brand?: string;
  model?: string;
  name?: string;
  collections?: readonly string[];
  tags?: readonly string[];
  storyHtml?: string;
  descriptionHtml?: string;
  photos?: ReadonlyArray<z.infer<typeof MoscotPhotoSchema>>;
  source?: z.infer<typeof MoscotSourceSchema>;
  price?: z.infer<typeof MoscotPriceSchema>;
  variants?: ReadonlyArray<MoscotVariant>;
  [k: string]: unknown; // passthrough
};

type NormalizedCategory = NormalizedProduct['category'];

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

const FrameFits = new Set(['narrow', 'average', 'wide', 'extra-wide']);
const UsageOptions = new Set<z.infer<typeof NormalizedUsageSchema>>(
  NormalizedUsageSchema.options as unknown as Array<z.infer<typeof NormalizedUsageSchema>>,
);
const PhotoAngleOptions = new Set<z.infer<typeof NormalizedPhotoAngleSchema>>(
  NormalizedPhotoAngleSchema.options as unknown as Array<
    z.infer<typeof NormalizedPhotoAngleSchema>
  >,
);

function coerceCategory(value: string): NormalizedCategory {
  const normalized = value.trim();
  if (normalized === 'Sunglasses') return 'Frames';
  if (
    normalized === 'Frames' ||
    normalized === 'Accessories' ||
    normalized === 'Lenses' ||
    normalized === 'Contacts'
  ) {
    return normalized;
  }
  return 'Accessories';
}

function coerceUsage(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (UsageOptions.has(normalized as z.infer<typeof NormalizedUsageSchema>)) {
    return normalized as z.infer<typeof NormalizedUsageSchema>;
  }
  if (normalized === 'optical-sun' || normalized === 'sun-optical') return 'both';
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

const toArray = <T>(xs?: readonly T[] | T[]): T[] => (xs ? [...xs] : []);

// ----------------------------------------------------------------------------
/** Variants */
// ----------------------------------------------------------------------------

function mapMeasurements(variant: MoscotVariant) {
  const measurements = variant.measurements ?? {};
  const fallback = variant.size ?? {};
  const lensWidth = toNumber(measurements.lensWidth ?? fallback.lens);
  const lensHeight = toNumber(measurements.lensHeight);
  const frameWidth = toNumber(measurements.frameWidth);
  const bridge = toNumber(measurements.bridge ?? fallback.bridge);
  const temple = toNumber(measurements.temple ?? fallback.temple);

  if ([lensWidth, lensHeight, frameWidth, bridge, temple].every((value) => value === undefined)) {
    return undefined;
  }

  return {
    lensWidth,
    lensHeight,
    frameWidth,
    bridge,
    temple,
  } satisfies NonNullable<NormalizedFrameVariant['measurements']>;
}

function normalizeFrameVariant(
  variant: MoscotVariant,
  fallbackId: string,
  index: number,
): NormalizedFrameVariant {
  const id =
    typeof variant.id === 'string' && variant.id.trim().length > 0
      ? variant.id
      : `${fallbackId}:v${index}`;
  const fit = typeof variant.fit === 'string' ? variant.fit.trim().toLowerCase() : undefined;
  const normalizedFit =
    fit && FrameFits.has(fit) ? (fit as NormalizedFrameVariant['fit']) : undefined;
  const colorSource = variant.color ?? {};
  const colorName = typeof colorSource.name === 'string' ? colorSource.name.trim() : undefined;
  const color = colorName
    ? {
        name: colorName,
        swatch: typeof colorSource.swatch === 'string' ? colorSource.swatch : undefined,
        finish: typeof colorSource.finish === 'string' ? colorSource.finish : undefined,
      }
    : undefined;

  return {
    type: 'frame',
    id,
    sku: typeof variant.sku === 'string' ? variant.sku : undefined,
    barcode: typeof variant.barcode === 'string' ? variant.barcode : undefined,
    sizeLabel: typeof variant.sizeLabel === 'string' ? variant.sizeLabel : undefined,
    fit: normalizedFit,
    usage: coerceUsage(variant.usage),
    measurements: mapMeasurements(variant),
    color,
    polarized: typeof variant.polarized === 'boolean' ? variant.polarized : undefined,
    clipCompatible:
      typeof variant.clipCompatible === 'boolean' ? variant.clipCompatible : undefined,
    notes: typeof variant.notes === 'string' ? variant.notes : undefined,
    attributes: variant.attributes,
  };
}

function normalizeAccessoryVariant(
  variant: MoscotVariant,
  fallbackId: string,
  index: number,
): NormalizedAccessoryVariant {
  const id =
    typeof variant.id === 'string' && variant.id.trim().length > 0
      ? variant.id
      : `${fallbackId}:v${index}`;
  const colorSource = variant.color ?? {};
  const colorName = typeof colorSource.name === 'string' ? colorSource.name.trim() : undefined;
  const color = colorName
    ? {
        name: colorName,
        swatch: typeof colorSource.swatch === 'string' ? colorSource.swatch : undefined,
        finish: typeof colorSource.finish === 'string' ? colorSource.finish : undefined,
      }
    : undefined;

  return {
    type: 'accessory',
    id,
    sku: typeof variant.sku === 'string' ? variant.sku : undefined,
    barcode: typeof variant.barcode === 'string' ? variant.barcode : undefined,
    sizeLabel: typeof variant.sizeLabel === 'string' ? variant.sizeLabel : undefined,
    packSize: toNumber(variant.packSize),
    color,
    notes: typeof variant.notes === 'string' ? variant.notes : undefined,
    attributes: variant.attributes,
  };
}

function buildFallbackVariant(category: NormalizedCategory, catalogId: string): NormalizedVariant {
  switch (category) {
    case 'Frames':
      return {
        type: 'frame',
        id: `${catalogId}:variant`,
      } satisfies NormalizedFrameVariant;
    case 'Lenses':
      return {
        type: 'lens',
        id: `${catalogId}:variant`,
      } as NormalizedVariant;
    case 'Contacts':
      return {
        type: 'contact',
        id: `${catalogId}:variant`,
      } as NormalizedVariant;
    case 'Accessories':
    default:
      return {
        type: 'accessory',
        id: `${catalogId}:variant`,
      } satisfies NormalizedAccessoryVariant;
  }
}

function normalizeVariants(
  product: MoscotAdapterInput,
  category: NormalizedCategory,
): NormalizedVariant[] {
  const list = Array.isArray(product.variants) ? product.variants : [];
  if (list.length === 0) {
    return [buildFallbackVariant(category, product.catalogId)];
  }

  if (category === 'Frames') {
    return list.map((variant, index) => normalizeFrameVariant(variant, product.catalogId, index));
  }

  if (category === 'Accessories') {
    return list.map((variant, index) =>
      normalizeAccessoryVariant(variant, product.catalogId, index),
    );
  }

  return [buildFallbackVariant(category, product.catalogId)];
}

// ----------------------------------------------------------------------------
/** Photos (with precise typing) */
// ----------------------------------------------------------------------------

type NormalizedPhoto = z.infer<typeof NormalizedPhotoSchema>;

function toAngle(
  input: unknown,
):
  | 'front'
  | 'quarter'
  | 'side'
  | 'temple'
  | 'model'
  | 'detail'
  | 'pack'
  | 'clip'
  | 'unknown'
  | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim().toLowerCase();
  return PhotoAngleOptions.has(v as any) ? (v as any) : 'unknown';
}

function normalizePhotos(product: MoscotAdapterInput): NormalizedPhoto[] {
  const list = Array.isArray(product.photos) ? product.photos : [];
  return list
    .map((photo): NormalizedPhoto | null => {
      const src = typeof photo.source === 'string' ? photo.source.toLowerCase() : undefined;
      const source: 'catalog' | 'local' | undefined =
        src === 'local' ? 'local' : src === 'catalog' ? 'catalog' : undefined;

      const angle = toAngle(photo.angle);

      const url = typeof photo.url === 'string' ? photo.url : '';
      if (!url) return null;

      return {
        url,
        label: typeof photo.label === 'string' ? photo.label : undefined,
        isHero: typeof photo.isHero === 'boolean' ? photo.isHero : undefined,
        source,
        angle,
        colorwayName: typeof photo.colorwayName === 'string' ? photo.colorwayName : undefined,
      };
    })
    .filter((p): p is NormalizedPhoto => !!p);
}

// ----------------------------------------------------------------------------
/** Other field mappers */
// ----------------------------------------------------------------------------

function normalizeSource(product: MoscotAdapterInput) {
  const source = (product.source ??
    ({} as NonNullable<z.infer<typeof MoscotSourceSchema>>)) as NonNullable<
    z.infer<typeof MoscotSourceSchema>
  >;

  return {
    url: typeof source.url === 'string' ? source.url : undefined,
    retrievedAt: typeof source.lastSyncISO === 'string' ? source.lastSyncISO : undefined,
    priceList: undefined,
    note: typeof source.supplier === 'string' ? source.supplier : undefined,
  };
}

function normalizePrice(product: MoscotAdapterInput) {
  if (!product.price) return undefined;
  const amount = toNumber((product.price as any)?.amount);
  const currency =
    typeof (product.price as any)?.currency === 'string'
      ? (product.price as any).currency.trim()
      : undefined;
  if (amount === undefined || !currency) return undefined;
  return { amount, currency } as NormalizedProduct['price'];
}

// ----------------------------------------------------------------------------
/** Main normalize function */
// ----------------------------------------------------------------------------

export function normalizeMoscotProduct(raw: MoscotAdapterInput): NormalizedProduct {
  const category = coerceCategory(raw.category);

  const tags = toArray(raw.tags).filter((t) => typeof t === 'string' && t.trim().length > 0);
  const collections = toArray(raw.collections).filter(
    (c) => typeof c === 'string' && c.trim().length > 0,
  );

  const extras: Record<string, unknown> = {};
  if (raw.source?.confidence) extras.sourceConfidence = raw.source.confidence;
  if (raw.source?.supplier && raw.source.supplier !== DEFAULT_VENDOR_NAME) {
    extras.supplierLabel = raw.source.supplier;
  }

  return {
    vendor: {
      slug: DEFAULT_VENDOR_SLUG,
      name: DEFAULT_VENDOR_NAME,
    },
    catalogId: raw.catalogId,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    model: typeof raw.model === 'string' ? raw.model : undefined,
    brand: typeof raw.brand === 'string' ? raw.brand : undefined,
    category,
    tags: tags.length ? tags : undefined,
    collections: collections.length ? collections : undefined,
    descriptionHtml: typeof raw.descriptionHtml === 'string' ? raw.descriptionHtml : undefined,
    storyHtml: typeof raw.storyHtml === 'string' ? raw.storyHtml : undefined,
    photos: normalizePhotos(raw),
    source: normalizeSource(raw),
    price: normalizePrice(raw),
    variants: normalizeVariants(raw, category),
    extras: Object.keys(extras).length > 0 ? extras : undefined,
    raw,
  } satisfies NormalizedProduct;
}

// ----------------------------------------------------------------------------
// Adapter registration
// ----------------------------------------------------------------------------

export const moscotNormalizationAdapter: NormalizationAdapter<MoscotRawProduct> = {
  key: 'moscot.catalog',
  vendor: {
    slug: DEFAULT_VENDOR_SLUG,
    name: DEFAULT_VENDOR_NAME,
  },
  inputSchema: MoscotRawProductSchema,
  normalize: normalizeMoscotProduct,
};
