// src/lib/scrapers/moscot.ts
import * as z from 'zod';
import pLimit from 'p-limit';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

/* --------------------------------------------------------- */
/* Types emitted by the raw page parser (mapped later)       */
/* --------------------------------------------------------- */

export type MoscotVariant = {
  color: string;
  sizeLabel?: string; // e.g., "49"
  fit?: 'narrow' | 'average' | 'wide' | 'extra-wide';
  price?: { amount: number; currency: string };
  measurements?: {
    lensWidth?: number;
    lensHeight?: number;
    frameWidth?: number;
    bridge?: number;
    temple?: number;
  };
};

export type MoscotPDP = {
  url: string;
  handle: string;
  title: string;
  family?: string;
  storyHtml?: string;
  features?: string[];
  price?: { amount: number; currency: string };
  colors: string[];
  sizes: string[]; // "49", "52" etc.
  variants: MoscotVariant[];
  photos: {
    url: string;
    label?: string;
    angle?: string;
    colorwayName?: string;
    isHero?: boolean;
  }[];
  tags?: string[];
  virtualTryOn?: boolean;
};

/* --------------------------------------------------------- */
/* Utilities                                                  */
/* --------------------------------------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NUM = (s?: string) => {
  if (!s) return undefined;
  const m = s.replace(/[, ]/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

function normalizeCurrency(any?: string): string {
  if (!any) return 'USD';
  if (/€|eur/i.test(any)) return 'EUR';
  if (/\$|usd/i.test(any)) return 'USD';
  return 'USD';
}

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

function guessAngle(urlOrLabel?: string): string {
  const s = (urlOrLabel || '').toLowerCase();
  // heuristics for MOSCOT filenames (pos-1 etc.) & common descriptors
  if (/front|primary|hero|main|pos-1\b|_pos-1\b/.test(s)) return 'front';
  if (/quarter|3\/4|3-4|angle|pos-2\b|_pos-2\b/.test(s)) return 'quarter';
  if (/side|profile|pos-3\b|_pos-3\b/.test(s)) return 'side';
  if (/temple|arm/.test(s)) return 'temple';
  if (/model|try/i.test(s)) return 'model';
  if (/detail|close/.test(s)) return 'detail';
  if (/pack|box/.test(s)) return 'pack';
  if (/clip/.test(s)) return 'clip';
  return 'unknown';
}

function colorFromAlt(alt?: string): string | undefined {
  if (!alt) return undefined;
  // e.g. "The LEMTOSH in Tortoise"
  const m = alt.match(/\bin\s+([A-Za-z ]+)\b/i);
  return m ? m[1].trim() : undefined;
}

/* --------------------------------------------------------- */
/* HTTP                                                      */
/* --------------------------------------------------------- */

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ClairityCatalogBot/1.0 (+https://clairity.app)',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return await res.text();
}

/* --------------------------------------------------------- */
/* Collections → product handles                              */
/* --------------------------------------------------------- */

export async function listProductHandles(collectionUrl: string, maxPages = 10): Promise<string[]> {
  const handles = new Set<string>();

  for (let p = 1; p <= maxPages; p++) {
    const url = p === 1 ? collectionUrl : `${collectionUrl}?page=${p}`;
    const html = await fetchHtml(url);
    const $: CheerioAPI = load(html);

    // Target product grid anchors only
    $('a[href*="/products/"]').each((_, el: Element) => {
      const href = $(el).attr('href') ?? '';
      // Avoid collections links and nav
      if (!/\/products\//i.test(href)) return;
      const m = href.match(/\/products\/([a-z0-9-]+)/i);
      if (m) handles.add(m[1].toLowerCase());
    });

    // pagination heuristic
    const hasNext =
      $('a[aria-label*="Next"], a[rel="next"]').length > 0 ||
      $('button[aria-label*="Next"]').length > 0;
    if (!hasNext && p > 1) break;

    await sleep(350);
  }

  return [...handles];
}

/* --------------------------------------------------------- */
/* PDP parsing                                               */
/* --------------------------------------------------------- */

function parseMeasurementsBlock(block: string) {
  const rows = block.split('\n').map((s) => s.trim());
  const out: Partial<MoscotVariant['measurements']> = {};
  for (const row of rows) {
    if (/lens width/i.test(row)) out.lensWidth = NUM(row);
    else if (/lens height/i.test(row)) out.lensHeight = NUM(row);
    else if (/frame width/i.test(row)) out.frameWidth = NUM(row);
    else if (/bridge/i.test(row)) out.bridge = NUM(row);
    else if (/temple/i.test(row)) out.temple = NUM(row);
  }
  return out;
}

/**
 * Restrictive story sanitizer at scrape time:
 * - keep only p/br/em/strong/ul/ol/li/a
 * - drop attributes except href/title/target/rel on <a>
 * - strip script/style/noscript/link/meta/svg/form elements and inline handlers/styles
 */
function sanitizeStoryHtml(raw?: string): string | undefined {
  if (!raw) return undefined;
  const $ = load(`<div id="root">${raw}</div>`);
  const root = $('#root');

  // remove dangerous elements globally
  root
    .find('script, style, noscript, iframe, link, meta, svg, form, button, input, select')
    .remove();

  const allowed = new Set(['p', 'br', 'em', 'strong', 'ul', 'ol', 'li', 'a']);
  root.find('*').each((_, el) => {
    const name = el.tagName?.toLowerCase?.() || '';
    if (!allowed.has(name)) {
      // unwrap non-allowed nodes but keep their text
      const $el = $(el);
      $el.replaceWith($el.text());
      return;
    }
    // scrub attributes
    const $el = $(el);
    for (const attr of el.attribs ? Object.keys(el.attribs) : []) {
      const low = attr.toLowerCase();
      const val = $el.attr(attr) || '';
      if (name === 'a') {
        if (!/(^href$|^title$|^target$|^rel$)/.test(low)) $el.removeAttr(attr);
        if (low === 'href' && /^javascript:/i.test(val)) $el.removeAttr('href');
        if (low === 'target' && val === '_blank') $el.attr('rel', 'noopener noreferrer');
      } else {
        $el.removeAttr(attr);
      }
      if (/^on/i.test(low)) $el.removeAttr(attr);
    }
  });

  // collapse whitespace a bit
  const cleaned = root
    .html()
    ?.replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned) return undefined;

  // cap overly long blobs
  return cleaned.length > 4000 ? cleaned.slice(0, 4000) : cleaned;
}

function collectPhotos($: CheerioAPI): MoscotPDP['photos'] {
  const out: MoscotPDP['photos'] = [];

  // Only accept Shopify CDN product images (avoid flags/icons):
  // typical: https://moscot.com/cdn/shop/files/... or /cdn/shop/products/...
  $('img').each((_, img: Element) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-original') || '';
    if (!src) return;

    // normalize to absolute
    const abs = src.startsWith('http') ? src : `https:${src}`;

    // reject non-product assets (flags, sprites, static images)
    if (!/\/cdn\/shop\//i.test(abs)) return;
    if (/\/static\//i.test(abs)) return;

    const alt = ($(img).attr('alt') || '').trim();

    out.push({
      url: abs,
      label: alt || undefined,
      angle: guessAngle(alt || abs),
      colorwayName: colorFromAlt(alt),
      isHero: false, // fix up later
    });
  });

  // de-dupe by filename (basename)
  const seen = new Set<string>();
  const deduped: MoscotPDP['photos'] = [];
  for (const p of out) {
    const file = p.url.split('?')[0].split('/').pop() || p.url;
    if (seen.has(file)) continue;
    seen.add(file);
    deduped.push(p);
  }

  // mark hero heuristically: prefer a "front"/"hero"/pos-1
  let heroIdx = deduped.findIndex((p) => p.angle === 'front');
  if (heroIdx < 0) heroIdx = deduped.length > 0 ? 0 : -1;
  if (heroIdx >= 0 && deduped[heroIdx]) deduped[heroIdx].isHero = true;

  const orderLookup = new Map<MoscotPDP['photos'][number], number>();
  deduped.forEach((photo, idx) => orderLookup.set(photo, idx));

  const hero = heroIdx >= 0 ? deduped[heroIdx] : undefined;
  const rest = hero
    ? deduped.filter((_, i) => i !== heroIdx)
    : deduped.slice();

  rest.sort((a, b) => {
    const angleDiff =
      (ANGLE_ORDER[a.angle || 'unknown'] ?? 9) - (ANGLE_ORDER[b.angle || 'unknown'] ?? 9);
    if (angleDiff !== 0) return angleDiff;
    return (orderLookup.get(a) ?? 0) - (orderLookup.get(b) ?? 0);
  });

  if (hero) {
    return [hero, ...rest];
  }

  return rest;
}

export async function parsePDP(url: string): Promise<MoscotPDP> {
  const html = await fetchHtml(url);
  const $: CheerioAPI = load(html);

  const title = $('h1').first().text().trim() || $('title').text().trim() || 'Untitled';
  const handle = (url.split('/products/')[1] || '').split(/[?#]/)[0];

  // price (frame-only)
  const priceText =
    $('span:contains("Sale price"), .price, [data-product-price]').first().text() ||
    $('meta[itemprop="price"]').attr('content') ||
    '';
  const amount = NUM(priceText);
  const currency = priceText.includes('€') ? 'EUR' : priceText.includes('$') ? 'USD' : 'USD';

  // colors & sizes
  const colors: string[] = [];
  $('label:contains("Color"), label:contains("Select Your Color"), [data-option-label="Color"]')
    .parent()
    .find('button, option, span')
    .each((_, el: Element) => {
      const t = $(el).text().trim();
      if (t && /^[A-Za-z].+/.test(t) && !/Select/i.test(t)) colors.push(t);
    });

  const sizes: string[] = [];
  $('label:contains("Size"), label:contains("Select Your Size")')
    .parent()
    .find('button, option, span')
    .each((_, el: Element) => {
      const t = $(el).text().trim();
      const m = t.match(/\b(\d{2})\b/);
      if (m) sizes.push(m[1]);
    });

  // features list (deduped)
  const featuresRaw: string[] = [];
  $('li').each((_, li: Element) => {
    const t = $(li).text().trim();
    if (/Handcrafted|7[- ]?Barrel hinge|Italian acetate|rivets|nose/i.test(t)) {
      featuresRaw.push(t);
    }
  });
  const features = Array.from(new Set(featuresRaw));

  // story / description (best effort) – select product description blocks only
  const storyCandidate =
    $('.product__description, .product .rte, .product__content, [data-product-description]')
      .first()
      .html() ||
    $('meta[name="description"]').attr('content') ||
    undefined;
  const storyHtml = sanitizeStoryHtml(storyCandidate);

  // measurements: scrape any block labelled “Measurements”
  let measurementsBlock = '';
  $('div:contains("Measurements"), details:contains("Measurements")')
    .first()
    .find('*')
    .each((_, el: Element) => {
      const text = $(el).text();
      if (text) measurementsBlock += `${text}\n`;
    });
  const commonMeasurements = measurementsBlock
    ? parseMeasurementsBlock(measurementsBlock)
    : undefined;

  // Photos (strict)
  const photos = collectPhotos($);

  // tags / collections (best effort, dedupe)
  const tagsRaw: string[] = [];
  if (/ORIGINALS/i.test(html)) tagsRaw.push('Originals');
  if (/Custom Made Tints/i.test(html)) tagsRaw.push('Custom Tints');
  if (/CLIPTOSH|clip\-?on/i.test(html)) tagsRaw.push('Clip-compatible');
  const tags = Array.from(new Set(tagsRaw));
  const virtualTryOn = /VIRTUAL TRY-ON/i.test(html);

  // Variants
  let variants: MoscotVariant[] = [];
  const uniqColors = Array.from(new Set(colors));
  const uniqSizes = Array.from(new Set(sizes));

  if (uniqColors.length && uniqSizes.length) {
    for (const c of uniqColors) {
      for (const s of uniqSizes) {
        variants.push({
          color: c,
          sizeLabel: s,
          fit: /49/.test(s) ? 'average' : /52/.test(s) ? 'wide' : undefined,
          price: amount ? { amount, currency } : undefined,
          measurements: commonMeasurements,
        });
      }
    }
  } else {
    // Fallback: infer one variant
    const inferredColor =
      uniqColors[0] ||
      colorFromAlt(photos.find((p) => p.isHero)?.label) ||
      (title.match(
        /\b(Black|Tortoise|Crystal|Clear|Flesh|Tobacco|Burgundy|Brown|Blue|Grey|Gray|Gold|Silver)\b/i,
      )?.[0] ??
        'Unknown');

    const sizeFromTitle = title.match(/\b(\d{2})\b/)?.[1];
    const sizeFromMeasure = String(commonMeasurements?.lensWidth || '');
    const inferredSize = sizeFromTitle || sizeFromMeasure || undefined;

    variants.push({
      color: inferredColor,
      sizeLabel: inferredSize,
      fit: inferredSize === '49' ? 'average' : inferredSize === '52' ? 'wide' : undefined,
      price: amount ? { amount, currency } : undefined,
      measurements: commonMeasurements,
    });
  }

  return {
    url,
    handle,
    title,
    family: tags.includes('Originals') ? 'Originals' : undefined,
    storyHtml,
    features,
    price: amount ? { amount, currency } : undefined,
    colors: uniqColors,
    sizes: uniqSizes,
    variants,
    photos,
    tags,
    virtualTryOn,
  };
}

/* --------------------------------------------------------- */
/* Crawl all collections                                     */
/* --------------------------------------------------------- */

export async function crawlAll({
  base = 'https://moscot.com',
  collections = [
    '/collections/eyeglasses',
    '/collections/sunglasses',
    '/collections/moscot-originals-eyeglasses',
  ],
  maxPages = 10,
  concurrency = 2,
}: {
  base?: string;
  collections?: string[];
  maxPages?: number;
  concurrency?: number;
}) {
  const limit = pLimit(concurrency);
  const seen = new Set<string>();
  const results: MoscotPDP[] = [];

  for (const path of collections) {
    const url = `${base}${path}`;
    const handles = await listProductHandles(url, maxPages);

    for (const h of handles) {
      if (seen.has(h)) continue;
      seen.add(h);

      const pdpUrl = `${base}/products/${h}`;
      results.push(
        await limit(async () => {
          await sleep(400);
          try {
            return await parsePDP(pdpUrl);
          } catch {
            return {
              url: pdpUrl,
              handle: h,
              title: h,
              colors: [],
              sizes: [],
              variants: [],
              photos: [],
            } as MoscotPDP;
          }
        }),
      );
    }
  }
  return results;
}
