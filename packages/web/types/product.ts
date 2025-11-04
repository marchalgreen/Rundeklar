// src/types/product.ts

/** Product categories Clairity cares about */
export type ProductCategory = 'Frames' | 'Lenses' | 'Contacts' | 'Accessories';

/** A generic color — use tokens or hex only for display purposes */
export type ProductColor = {
  name: string; // "Black", "Tortoise", "Gunmetal"
  swatch?: string; // hex or token for display (optional)
};

/** Usage type, mainly for frames and sunglasses */
export type UsageType = 'optical' | 'sun' | 'both';

/** Catalog sync status */
export type CatalogConfidence = 'verified' | 'manual' | 'unlinked';

export type CatalogSource = {
  supplier: string; // e.g. "MOSCOT", "Luxottica", "Essilor"
  url?: string; // optional deep link to supplier portal / PDP
  lastSyncISO?: string; // ISO date of last sync
  confidence: CatalogConfidence;
};

/** Optional metadata that helps gallery layout */
export type CatalogPhotoAngle =
  | 'front'
  | 'quarter'
  | 'side'
  | 'temple'
  | 'model'
  | 'detail'
  | 'pack'
  | 'clip'
  | 'unknown';

export type CatalogPhoto = {
  url: string;
  label?: string;
  isHero?: boolean;
  source?: 'catalog' | 'local';
  angle?: CatalogPhotoAngle; // used for ordering the gallery
  /** Colorway this photo belongs to, if any (e.g., "Burgundy") */
  colorwayName?: string;
};

/** Commerce fields (optional; not a POS) */
export type Price = { amount: number; currency: string };

/** Base product in the catalog */
export type CatalogProductBase = {
  catalogId: string; // supplier catalog ID / handle (stable)
  brand?: string;
  model?: string;
  name?: string; // display name, may include colorway
  /** e.g., ["Originals", "Best Sellers"] */
  collections?: string[];
  tags?: string[];
  category: ProductCategory;
  photos: CatalogPhoto[];
  specs?: Record<string, string | number | boolean | undefined>;
  source: CatalogSource;
  /** Rich marketing copy (e.g., MOSCOT "Story") */
  storyHtml?: string;
  /** Primary price shown on PDP (frame-only) */
  price?: Price;
  /** Virtual try-on available? */
  virtualTryOn?: boolean;
};

/** Shared frame measurements (mm) */
export type FrameMeasurements = {
  lensWidth?: number;
  lensHeight?: number;
  frameWidth?: number;
  bridge?: number;
  temple?: number;
};

/** MOSCOT-style fit buckets (mapped to our UX) */
export type FrameFit = 'narrow' | 'average' | 'wide' | 'extra-wide';

/** Specifics for Frames **/
export type FrameVariant = {
  id: string;
  sku?: string; // variant SKU (optional)
  /** Legacy simple size */
  size?: { lens?: number; bridge?: number; temple?: number };
  /** Rich measurements parsed from supplier */
  measurements?: FrameMeasurements;
  /** e.g. "49" corresponds to lensWidth=49 */
  sizeLabel?: string; // "49", "52"
  fit?: FrameFit; // 'average' | 'wide' etc.
  color?: ProductColor & { finish?: 'matte' | 'gloss' | 'mixed' | string };
  usage?: UsageType; // 'optical' | 'sun' | 'both'
  polarized?: boolean;
  /** Clip-on compatibility by model line */
  clipCompatible?: boolean;
  barcode?: string;
};

/** Specifics for Lenses (ophthalmic) **/
export type LensVariant = {
  id: string;
  sku?: string;
  index?: '1.5' | '1.56' | '1.59' | '1.6' | '1.67' | '1.74';
  coating?: 'UC' | 'BlueGuard' | 'Crizal' | 'Photochromic' | string;
  diameter?: number; // mm
  baseCurve?: number; // diopters
  barcode?: string;
};

/** Specifics for Contacts **/
export type ContactVariant = {
  id: string;
  sku?: string;
  power?: number; // sphere (D)
  cylinder?: number; // cyl (D)
  axis?: number; // degrees
  baseCurve?: number; // mm
  diameter?: number; // mm
  packSize?: number; // 30, 90 etc.
  barcode?: string;
};

/** Specifics for Accessories **/
export type AccessoryVariant = {
  id: string;
  sku?: string;
  color?: ProductColor;
  sizeLabel?: string; // e.g. "S/M/L", "One Size"
  packSize?: number;
  barcode?: string;
};

/** Polymorphic catalog product w/typed variant arrays */
export type CatalogProduct =
  | (CatalogProductBase & { category: 'Frames'; variants: FrameVariant[] })
  | (CatalogProductBase & { category: 'Lenses'; variants: LensVariant[] })
  | (CatalogProductBase & { category: 'Contacts'; variants: ContactVariant[] })
  | (CatalogProductBase & { category: 'Accessories'; variants: AccessoryVariant[] });

/** Utility: calculates human readable "time since" */
export function timeSinceISO(iso?: string): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const d = Math.max(0, now - then);
  const days = Math.floor(d / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const hours = Math.floor(d / (1000 * 60 * 60));
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const mins = Math.floor(d / (1000 * 60));
  return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
}

/**
 * Formats frame variant sizing as "lens-bridge-temple" when measurements are available.
 * Falls back to size labels for legacy catalog records.
 */
export function frameVariantSizeLabel(variant: FrameVariant): string | undefined {
  const lens = variant.measurements?.lensWidth ?? variant.size?.lens;
  const bridge = variant.measurements?.bridge ?? variant.size?.bridge;
  const temple = variant.measurements?.temple ?? variant.size?.temple;

  if (lens || bridge || temple) {
    const parts = [lens, bridge, temple].map((value) =>
      typeof value === 'number' ? String(value) : value ?? '—',
    );
    return parts.join('-');
  }

  return variant.sizeLabel;
}
