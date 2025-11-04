// scripts/import-demo-catalog.ts
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

type Price = { amount: number; currency: string };

type CatalogPhoto = {
  url: string;
  label?: string;
  isHero?: boolean;
  source?: 'catalog' | 'local';
  angle?: string;
  colorwayName?: string;
};

type CatalogProduct = {
  catalogId: string;
  brand?: string;
  model?: string;
  name?: string;
  collections?: string[];
  tags?: string[];
  category: 'Frames' | 'Lenses' | 'Contacts' | 'Accessories';
  photos: CatalogPhoto[];
  specs?: Record<string, string | number | boolean | undefined>;
  source: { supplier: string; url?: string; lastSyncISO?: string; confidence: string };
  storyHtml?: string;
  price?: Price;
  virtualTryOn?: boolean;
  variants: any[]; // we only need sku/color/size-ish for mapping
};

/** The shape your inventory UI already expects (minimal) */
type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: 'Frames' | 'Sunglasses' | 'Lenses' | 'Contacts' | 'Accessories';
  qty: number;
  barcode?: string;
  updatedAt: string; // ISO or nice string
  brand?: string;
  model?: string;
  color?: string;
  sizeLabel?: string;
  usage?: 'optical' | 'sun' | 'both';
};

/* ----------------- helpers ----------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveOut(rel: string) {
  return path.resolve(__dirname, '..', rel);
}

function slugify(x?: string) {
  return (x || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, '-')
    .replace(/\-+/g, '-');
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function nowISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${d.toLocaleTimeString()}`;
}

/* ----------------- main ----------------- */

async function loadCatalogFromApi(): Promise<CatalogProduct[]> {
  const api = process.env.CATALOG_API || 'http://localhost:3000/api/catalog/moscot';
  const res = await fetch(api, { cache: 'no-store' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || res.statusText);
  }
  const j = await res.json();
  const list = (j?.products || []) as CatalogProduct[];
  return Array.isArray(list) ? list : [];
}

async function loadCatalogFromFile(fp: string): Promise<CatalogProduct[]> {
  const buf = await fs.readFile(fp, 'utf8');
  const arr = JSON.parse(buf);
  if (!Array.isArray(arr)) throw new Error('catalog file is not an array');
  return arr as CatalogProduct[];
}

/**
 * Maps vendor catalog products → local demo inventory items.
 * Each variant becomes a row with qty 0–5.
 */
function mapCatalogToInventory(products: CatalogProduct[]): InventoryItem[] {
  const out: InventoryItem[] = [];
  for (const p of products) {
    const brand = p.brand || 'Brand';
    // MOSCOT often encodes the collection in model; fall back to friendly name
    const model = p.model && !/originals/i.test(p.model) ? p.model : p.name || p.catalogId;
    const variants = (p.variants?.length ? p.variants : [{ id: p.catalogId }]) as any[];
    for (const v of variants) {
      const color = v.color?.name && !/unknown/i.test(v.color.name) ? v.color.name : undefined;
      const sizeLabel = v.sizeLabel || undefined;
      const usage = (v.usage as 'optical' | 'sun' | 'both') || undefined;

      const variantSku =
        v.sku ||
        `${p.catalogId}-${(color || 'Unknown').replace(/\s+/g, '')}-${sizeLabel || 'Unknown'}`;

      const base = model || p.catalogId;
      const name = [base, sizeLabel, color && `— ${color}`].filter(Boolean).join(' ');

      const isSun = String(usage || '').toLowerCase() === 'sun';
      const category: InventoryItem['category'] =
        p.category === 'Frames' && isSun ? 'Sunglasses' : p.category;

      // pseudo-random qty for demo (stable-ish)
      const h = [...variantSku].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
      const qty = h % 6; // 0..5

      out.push({
        id: `demo_${p.catalogId}_${v.id || slugify(variantSku)}`,
        sku: variantSku,
        name,
        category,
        qty,
        updatedAt: nowISO(),
        // explicit projection fields for facets inventory
        brand,
        model: base,
        color,
        sizeLabel,
        usage,
      });
    }
  }
  return out;
}

async function main() {
  const OUTPUT = resolveOut('packages/web/src/lib/mock/inventory.demo.json');
  const FILE = process.env.MOSCOT_OUTPUT || '/tmp/moscot.catalog.json';

  // Prefer file if exists; else try API
  let products: CatalogProduct[] = [];
  try {
    const stat = await fs.stat(FILE).catch(() => null);
    if (stat?.isFile()) {
      console.log(`[import] reading file: ${FILE}`);
      products = await loadCatalogFromFile(FILE);
    } else {
      console.log('[import] fetching from API: /api/catalog/moscot');
      products = await loadCatalogFromApi();
    }
  } catch (err: any) {
    console.error('[import] failed to load catalog:', err?.message || err);
    process.exit(1);
  }

  const items = mapCatalogToInventory(products);
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(items, null, 2), 'utf8');

  console.log(`[import] wrote ${items.length} demo inventory items → ${OUTPUT}`);
  console.log(`[import] first: ${items[0]?.sku ?? 'none'}`);
}

main().catch((err) => {
  console.error('[import] error', err);
  process.exit(1);
});
