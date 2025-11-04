// scripts/moscot-scrape.ts
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { crawlAll, type MoscotPDP } from '../packages/web/src/lib/scrapers/moscot.ts';
import { normalizeColorName, titleCaseWord } from '../packages/web/src/lib/variants/colors.ts';
import type {
  CatalogProduct,
  CatalogPhoto,
  ProductCategory,
  FrameVariant,
  CatalogSource,
  Price,
} from '../packages/web/src/types/product.ts';

/* --------------------------------------------------------- */
/* Path utils                                                 */
/* --------------------------------------------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve a value to an absolute fs path (never a URL) */
function toFsPath(input?: string | null, base: string = __dirname): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  return path.isAbsolute(s) ? s : path.resolve(base, s);
}

/* --------------------------------------------------------- */
/* Env / flags                                                */
/* --------------------------------------------------------- */

const PAGES = Number(process.env.MOSCOT_PAGES || 10);
const CONCURRENCY = Number(process.env.MOSCOT_CONCURRENCY || 2);
const OUTPUT = toFsPath(process.env.MOSCOT_OUTPUT) || '/tmp/moscot.catalog.json';

const BASE = process.env.MOSCOT_BASE || 'https://moscot.com';
const COLLECTIONS = (process.env.MOSCOT_COLLECTIONS &&
  process.env.MOSCOT_COLLECTIONS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)) || [
  '/collections/eyeglasses',
  '/collections/sunglasses',
  '/collections/moscot-originals-eyeglasses',
];
const MAX_PHOTOS = Math.max(
  1,
  Number.isFinite(Number(process.env.MOSCOT_MAX_PHOTOS))
    ? Number(process.env.MOSCOT_MAX_PHOTOS)
    : 12,
);
const SHOPIFY_DELAY_MIN_MS = Math.max(
  0,
  Number.isFinite(Number(process.env.MOSCOT_SHOPIFY_DELAY_MIN_MS))
    ? Number(process.env.MOSCOT_SHOPIFY_DELAY_MIN_MS)
    : 200,
);
const SHOPIFY_DELAY_MAX_MS = Math.max(
  SHOPIFY_DELAY_MIN_MS,
  Number.isFinite(Number(process.env.MOSCOT_SHOPIFY_DELAY_MAX_MS))
    ? Number(process.env.MOSCOT_SHOPIFY_DELAY_MAX_MS)
    : 400,
);

/* --------------------------------------------------------- */
/* Angle helper (dev sanity)                                  */
/* --------------------------------------------------------- */

const ANGLE_ORDER: Record<string, number> = {
  front: 1,
  quarter: 2,
  side: 3,
  temple: 4,
  model: 5,
  detail: 6,
  pack: 7,
  clip: 8,
  unknown: 9,
};

function firstAngle(photos: CatalogPhoto[] = []): string {
  const p = photos[0];
  return p?.angle || 'unknown';
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* --------------------------------------------------------- */
/* Shopify enrichment helpers                                */
/* --------------------------------------------------------- */

type ShopifyOption = {
  name?: string;
  position?: number;
  values?: string[];
};

type ShopifyImage = {
  id?: number | string;
  src?: string;
  alt?: string;
};

type ShopifyVariant = {
  id?: number | string;
  title?: string;
  sku?: string;
  barcode?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  featured_image?: ShopifyImage | null;
};

type ShopifyProduct = {
  handle?: string;
  options?: ShopifyOption[];
  variants?: ShopifyVariant[];
  images?: ShopifyImage[];
};

const shopifyCache = new Map<string, ShopifyProduct | null>();
let shopifyQueue: Promise<void> = Promise.resolve();

async function withShopifyThrottle<T>(task: () => Promise<T>): Promise<T> {
  let release: () => void = () => {};
  const prev = shopifyQueue;
  shopifyQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  const delayRange = SHOPIFY_DELAY_MAX_MS - SHOPIFY_DELAY_MIN_MS;
  const delay = SHOPIFY_DELAY_MIN_MS + Math.random() * (delayRange > 0 ? delayRange : 0);
  await wait(delay);
  try {
    return await task();
  } finally {
    release();
  }
}

async function fetchShopifyProduct(handle: string): Promise<ShopifyProduct | null> {
  if (!handle) return null;
  if (shopifyCache.has(handle)) return shopifyCache.get(handle) ?? null;

  const base = BASE.replace(/\/$/, '');
  const url = `${base}/products/${handle}.js`;

  try {
    const data = await withShopifyThrottle(async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ClairityCatalogBot/1.0 (+https://clairity.app)',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status !== 404) {
          console.warn(`[moscot] shopify fetch failed ${res.status} for ${handle}`);
        }
        return null;
      }

      return (await res.json()) as ShopifyProduct;
    });

    if (!data) {
      shopifyCache.set(handle, null);
      return null;
    }

    shopifyCache.set(handle, data);
    return data;
  } catch (err) {
    console.warn(`[moscot] shopify fetch error for ${handle}`, err);
    shopifyCache.set(handle, null);
    return null;
  }
}

function canonicalImageKey(url?: string | null): string | undefined {
  if (!url) return undefined;
  const clean = url.split('?')[0];
  const file = clean.split('/').pop();
  if (!file) return undefined;
  return file.toLowerCase();
}

function inferColorFromAlt(alt?: string | null): string | undefined {
  if (!alt) return undefined;
  const match = alt.match(/\b(?:in|color|colour)\s+([A-Za-z0-9 /&'’-]+?)(?:\s+(?:size|with)\b|$)/i);
  if (!match) return undefined;
  return normalizeColorName(match[1]);
}

function inferColorFromFilename(url?: string | null): string | undefined {
  if (!url) return undefined;
  const file = url.split('?')[0].split('/').pop() || '';
  const match = file.match(/-color-([a-z0-9-]+?)(?:-(?:pos|angle|front|side|quarter|model|detail)\b|\.|$)/i);
  if (!match) return undefined;
  const slug = match[1];
  if (!slug) return undefined;
  const normalized = slug
    .split('-')
    .filter(Boolean)
    .map((part) => (part.length <= 2 ? part.toUpperCase() : titleCaseWord(part)))
    .join(' ');
  return normalizeColorName(normalized);
}

function inferColorFromLabel(label?: string | null): string | undefined {
  return inferColorFromAlt(label || undefined);
}

function normalizeSizeLabel(size?: string | null): string | undefined {
  if (!size) return undefined;
  const trimmed = size.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/\b(\d{2})\b/);
  return (match ? match[1] : trimmed) || undefined;
}

function mergeMeasurements(
  a?: FrameVariant['measurements'],
  b?: FrameVariant['measurements'],
): FrameVariant['measurements'] | undefined {
  if (!a && !b) return undefined;
  return {
    lensWidth: b?.lensWidth ?? a?.lensWidth,
    lensHeight: b?.lensHeight ?? a?.lensHeight,
    frameWidth: b?.frameWidth ?? a?.frameWidth,
    bridge: b?.bridge ?? a?.bridge,
    temple: b?.temple ?? a?.temple,
  };
}

function mergeVariants(base: FrameVariant, incoming: FrameVariant): FrameVariant {
  return {
    ...base,
    ...incoming,
    sizeLabel: incoming.sizeLabel ?? base.sizeLabel,
    measurements: mergeMeasurements(base.measurements, incoming.measurements),
    fit: incoming.fit ?? base.fit,
    color: incoming.color ?? base.color,
    usage: incoming.usage ?? base.usage,
    polarized: incoming.polarized ?? base.polarized,
    clipCompatible: incoming.clipCompatible ?? base.clipCompatible,
    sku: incoming.sku ?? base.sku,
    barcode: incoming.barcode ?? base.barcode,
  };
}

function buildVariantKey(color?: string, size?: string): string {
  return `${(color || '').trim().toLowerCase()}|${(size || '').trim().toLowerCase()}`;
}

/* --------------------------------------------------------- */
/* Mapping: MoscotPDP -> CatalogProduct (Frames/Accessories)  */
/* --------------------------------------------------------- */

function normalizeCurrency(any?: string): string {
  if (!any) return 'USD';
  if (/€|eur/i.test(any)) return 'EUR';
  if (/\$|usd/i.test(any)) return 'USD';
  return 'USD';
}

/** Heuristic category detector (frames vs accessories) */
function inferCategory(p: MoscotPDP): ProductCategory {
  const titleLC = (p.title || '').toLowerCase();
  const urlLC = (p.url || '').toLowerCase();
  const tagsLC = (p.tags || []).map((t) => t.toLowerCase());

  const looksAccessory =
    /chamois|cloth|spray|case|cord|string|screw|nose\s*pad|clean|pocket|pouch|clip\s*case/i.test(
      titleLC,
    ) || tagsLC.some((t) => /accessor|care|clean/.test(t));

  if (looksAccessory) return 'Accessories';

  // We only expect Frames/Accessories from MOSCOT for now.
  // (Lenses/Contacts would come from other vendors)
  return 'Frames';
}

async function pdpToCatalog(p: MoscotPDP): Promise<CatalogProduct> {
  const shopify = await fetchShopifyProduct(p.handle);

  const clipCompatible = (p.tags || []).some((t) => /clip/i.test(t));
  const usage: FrameVariant['usage'] = /sunglass|sunglasses/i.test(p.url) ? 'sun' : 'optical';

  const slug = (s?: string) =>
    (s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'unk';

  const imageColorHints = new Map<string, string>();
  const registerImageHint = (src?: string | null, alt?: string | null, fallback?: string) => {
    const key = canonicalImageKey(src);
    if (!key) return;
    const color =
      normalizeColorName(inferColorFromAlt(alt)) ||
      normalizeColorName(fallback) ||
      inferColorFromFilename(src);
    if (!color) return;
    if (!imageColorHints.has(key)) {
      imageColorHints.set(key, color);
    }
  };

  if (shopify) {
    for (const img of shopify.images ?? []) {
      registerImageHint(img.src, img.alt);
    }
    for (const variant of shopify.variants ?? []) {
      const featured = variant.featured_image;
      const optColor =
        normalizeColorName(variant.option1) ||
        normalizeColorName(variant.option2) ||
        normalizeColorName(variant.option3) ||
        normalizeColorName(variant.title?.split('/')[0] || undefined);
      registerImageHint(featured?.src, featured?.alt, optColor || undefined);
    }
  }

  // Map PDP photos, dedupe by asset, preserve angle/color metadata
  const rawPhotos: Array<{ photo: CatalogPhoto; order: number }> = [];
  const seenPhotos = new Set<string>();
  const inputPhotos = p.photos || [];

  for (let i = 0; i < inputPhotos.length; i++) {
    const ph = inputPhotos[i];
    if (!ph?.url) continue;
    const key = canonicalImageKey(ph.url) || ph.url;
    if (seenPhotos.has(key)) continue;
    seenPhotos.add(key);

    const inferredColor =
      normalizeColorName(ph.colorwayName) ||
      imageColorHints.get(key) ||
      inferColorFromLabel(ph.label) ||
      inferColorFromFilename(ph.url);

    rawPhotos.push({
      photo: {
        url: ph.url,
        label: ph.label,
        isHero: Boolean(ph.isHero) || i === 0,
        source: 'catalog',
        angle: (ph.angle as CatalogPhoto['angle']) || 'unknown',
        colorwayName: inferredColor,
      },
      order: i,
    });
  }

  let heroIndex = rawPhotos.findIndex(({ photo }) => photo.isHero);
  if (heroIndex < 0 && rawPhotos.length > 0) {
    heroIndex = 0;
    rawPhotos[0].photo.isHero = true;
  }

  let orderedPhotos: CatalogPhoto[] = [];
  if (heroIndex >= 0 && rawPhotos[heroIndex]) {
    const heroEntry = rawPhotos[heroIndex];
    const restEntries = rawPhotos.filter((_, idx) => idx !== heroIndex);
    restEntries.sort((a, b) => {
      const angleDiff =
        (ANGLE_ORDER[a.photo.angle || 'unknown'] ?? 9) -
        (ANGLE_ORDER[b.photo.angle || 'unknown'] ?? 9);
      if (angleDiff !== 0) return angleDiff;
      return a.order - b.order;
    });
    orderedPhotos = [heroEntry.photo, ...restEntries.map((entry) => entry.photo)];
  } else {
    orderedPhotos = rawPhotos.map((entry) => entry.photo);
  }

  const photos: CatalogPhoto[] = orderedPhotos.slice(0, MAX_PHOTOS).map((photo, idx) => ({
    ...photo,
    isHero: idx === 0,
  }));

  const pdpVariants: FrameVariant[] = (p.variants || []).map((v, idx) => {
    const cleanColor = normalizeColorName(v.color);
    const cleanSize = normalizeSizeLabel(v.sizeLabel);
    const fallbackId = `${p.handle}-${cleanColor ? slug(cleanColor) : 'unk'}${
      cleanSize ? `-${slug(cleanSize)}` : ''
    }`;
    const skuCandidate = (v as any)?.sku as string | undefined;
    return {
      id: fallbackId || `${p.handle}-pdp-${idx + 1}`,
      sku: skuCandidate?.trim() || fallbackId,
      sizeLabel: cleanSize,
      measurements: v.measurements,
      fit: v.fit,
      color: cleanColor ? { name: cleanColor } : undefined,
      usage,
      polarized: undefined,
      clipCompatible,
      barcode: undefined,
    };
  });

  const variantsByKey = new Map<string, FrameVariant>();
  const addVariant = (candidate: FrameVariant) => {
    const key = buildVariantKey(candidate.color?.name, candidate.sizeLabel);
    const existing = variantsByKey.get(key);
    variantsByKey.set(key, existing ? mergeVariants(existing, candidate) : candidate);
  };

  if (shopify) {
    const options = shopify.options ?? [];
    const optionKeys: Array<keyof Pick<ShopifyVariant, 'option1' | 'option2' | 'option3'>> = [
      'option1',
      'option2',
      'option3',
    ];

    const colorIndex = options.findIndex((opt) => opt?.name && /color/i.test(opt.name));
    const sizeIndex = options.findIndex((opt) => opt?.name && /size/i.test(opt.name));

    for (const variant of shopify.variants ?? []) {
      const featured = variant.featured_image;
      const optionValue = (idx: number) =>
        idx >= 0 && idx < optionKeys.length ? variant[optionKeys[idx]] : undefined;

      const colorName =
        normalizeColorName(optionValue(colorIndex)) ||
        normalizeColorName(variant.title?.split('/')?.[0]) ||
        (canonicalImageKey(featured?.src)
          ? imageColorHints.get(canonicalImageKey(featured?.src)!)
          : undefined) ||
        inferColorFromAlt(featured?.alt);

      const sizeLabel = normalizeSizeLabel(optionValue(sizeIndex));
      const slugged = `${p.handle}-${colorName ? slug(colorName) : 'unk'}${
        sizeLabel ? `-${slug(sizeLabel)}` : ''
      }`;

      const candidate: FrameVariant = {
        id: slugged || `${p.handle}-${variant.id || 'variant'}`,
        sku: variant.sku?.trim() || slugged,
        sizeLabel,
        measurements: undefined,
        fit: undefined,
        color: colorName ? { name: colorName } : undefined,
        usage,
        polarized: undefined,
        clipCompatible,
        barcode: variant.barcode?.trim() || undefined,
      };

      addVariant(candidate);
    }
  }

  for (const v of pdpVariants) {
    addVariant(v);
  }

  // Derive variants by photo colorway when data is still incomplete
  if (variantsByKey.size === 0) {
    const colorCounts = new Map<string, number>();
    for (const ph of photos) {
      const color = ph.colorwayName?.trim();
      if (!color) continue;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
    for (const color of colorCounts.keys()) {
      const slugged = `${p.handle}-${slug(color)}`;
      addVariant({
        id: slugged,
        sku: slugged,
        color: { name: color },
        sizeLabel: undefined,
        usage,
        clipCompatible,
      });
    }
  }

  if (variantsByKey.size === 0) {
    const slugged = `${p.handle}-base`;
    addVariant({
      id: slugged,
      sku: p.handle,
      usage,
      clipCompatible,
    });
  }

  const variants: FrameVariant[] = Array.from(variantsByKey.values()).sort((a, b) => {
    const colorCmp = (a.color?.name || '').localeCompare(b.color?.name || '');
    if (colorCmp !== 0) return colorCmp;
    return (a.sizeLabel || '').localeCompare(b.sizeLabel || '');
  });

  const primaryPrice: Price | undefined = p.price
    ? { amount: p.price.amount, currency: p.price.currency || normalizeCurrency() }
    : undefined;

  const src: CatalogSource = {
    supplier: 'MOSCOT',
    url: p.url,
    lastSyncISO: new Date().toISOString(),
    confidence: 'verified',
  };

  const category = inferCategory(p);

  return {
    catalogId: p.handle,
    brand: 'MOSCOT',
    model: p.family || p.title,
    name: p.title,
    collections: Array.from(new Set(p.features || p.tags || [])),
    tags: Array.from(new Set(p.tags || [])),
    category,
    photos,
    specs: undefined,
    source: src,
    storyHtml: p.storyHtml,
    price: primaryPrice,
    virtualTryOn: !!p.virtualTryOn,
    variants,
  };
}

/* --------------------------------------------------------- */
/* Pretty logging                                             */
/* --------------------------------------------------------- */

function logHeader() {
  console.log(
    [
      '',
      `  MOSCOT scraper`,
      `  base=${BASE}`,
      `  collections=${COLLECTIONS.join(' | ')}`,
      `  pages=${PAGES}, concurrency=${CONCURRENCY}`,
      `  → ${OUTPUT}`,
      '',
    ].join('\n'),
  );
}

function fmt(ms: number) {
  const s = Math.round(ms / 100) / 10;
  return `${s.toFixed(1)}s`;
}

/* --------------------------------------------------------- */
/* Main                                                       */
/* --------------------------------------------------------- */

async function main() {
  const t0 = Date.now();
  logHeader();

  process.stdout.write(`  • crawling collections…\n`);
  const allPDPs = await crawlAll({
    base: BASE,
    collections: COLLECTIONS,
    maxPages: PAGES,
    concurrency: CONCURRENCY,
  });

  const discovered = allPDPs.length;

  // filter out stubs with nothing
  const usablePDPs = allPDPs.filter(
    (p) => p && (p.photos?.length || p.variants?.length || p.title),
  );
  const empty = discovered - usablePDPs.length;

  process.stdout.write(`  • mapping to CatalogProduct…\n`);
  const mapped: CatalogProduct[] = await Promise.all(usablePDPs.map((p) => pdpToCatalog(p)));

  // quick sanity: cap photos (parser enforces 3 already)
  const overPhotoLimit = mapped.filter((m) => (m.photos?.length || 0) > 3).length;
  if (overPhotoLimit > 0) {
    console.warn(`  ! ${overPhotoLimit} product(s) exceeded 3 photos (will still write file)`);
  }

  // stable order
  mapped.sort((a, b) => a.catalogId.localeCompare(b.catalogId));

  // category counts
  const counts = mapped.reduce<Record<ProductCategory, number>>(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    },
    { Frames: 0, Lenses: 0, Contacts: 0, Accessories: 0 },
  );

  // write
  await fs.mkdir(path.dirname(OUTPUT!), { recursive: true });
  await fs.writeFile(OUTPUT!, JSON.stringify(mapped, null, 2), 'utf8');

  // sample line
  const first = mapped[0];
  process.stdout.write(
    `  • sample: ${first?.catalogId ?? '—'} (photos=${first?.photos?.length ?? 0}, firstAngle=${first ? firstAngle(first.photos) : '—'})\n`,
  );

  const dt = Date.now() - t0;
  console.log(
    [
      '',
      `  done in ${fmt(dt)} `,
      `  discovered=${discovered}  usable=${mapped.length}  empty=${empty} `,
      `  frames=${counts['Frames'] ?? 0}  accessories=${counts['Accessories'] ?? 0}`,
      `  wrote → ${OUTPUT}`,
      '',
    ].join('\n'),
  );
}

main().catch((err) => {
  console.error('[moscot] error', err);
  process.exit(1);
});
