'use client';

import { useCatalog } from '@/store/catalog';
import { useCatalogLink } from '@/store/catalogLink';

import { DEFAULT_VENDOR_SLUG } from './vendorSlugs';
import type {
  AccessoryVariant,
  CatalogProduct,
  ContactVariant,
  FrameVariant,
  LensVariant,
} from '@/types/product';

export type AutoLinkResult =
  | { kind: 'linked-variant'; itemId: string; variantSku: string }
  | { kind: 'linked-product'; itemId: string; catalogId: string }
  | { kind: 'skipped'; itemId: string; reason: string };

const COLOR_ALIASES: Record<string, string[]> = {
  black: ['black', 'blk', 'matte black', 'ink'],
  navy: ['navy', 'blue', 'ink'],
  charcoal: ['charcoal', 'dark grey', 'grey', 'gray'],
  tortoise: ['tortoise', 'brown', 'tobacco', 'cinnamon'],
  amber: ['amber', 'gold'],
  sage: ['sage', 'green'],
  blonde: ['blonde', 'light'],
  rose: ['rose', 'pink'],
  monochrome: ['monochrome', 'mono'],
};

type AnyVariant = FrameVariant | LensVariant | ContactVariant | AccessoryVariant;

function normalizeColorTokens(...sources: Array<string | undefined>) {
  const val = sources
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .join(' ')
    .toLowerCase();
  if (!val) return new Set<string>();
  return new Set(val.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
}

function colorScore(...sources: Array<string | undefined>) {
  const tokens = normalizeColorTokens(...sources);
  let best = 0;
  for (const [canon, aliases] of Object.entries(COLOR_ALIASES)) {
    if (tokens.has(canon)) best = Math.max(best, 2);
    for (const alias of aliases) {
      if (tokens.has(alias)) {
        best = Math.max(best, 1);
        break;
      }
    }
    if (best === 2) break;
  }
  return best;
}

function parseTrailingNumber(input?: string): number | undefined {
  if (!input) return undefined;
  const match = input.match(/(\d{2,3})(?!.*\d)/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function parseSize(sku: string, name?: string): number | undefined {
  return parseTrailingNumber(sku) ?? parseTrailingNumber(name);
}

function extractVariantSize(v: AnyVariant | undefined): number | undefined {
  if (!v) return undefined;
  if ('size' in v && typeof v.size?.lens === 'number') return v.size.lens;
  if ('measurements' in v && typeof v.measurements?.lensWidth === 'number') {
    return v.measurements.lensWidth;
  }
  if ('sizeLabel' in v && typeof v.sizeLabel === 'string') return parseTrailingNumber(v.sizeLabel);
  if ('sku' in v && typeof v.sku === 'string') return parseTrailingNumber(v.sku);
  return undefined;
}

function variantColorName(v: AnyVariant | undefined): string | undefined {
  if (!v) return undefined;
  if ('color' in v && v.color && typeof v.color === 'object') {
    const maybe = (v as FrameVariant | AccessoryVariant).color;
    return maybe?.name;
  }
  return undefined;
}

function variantList(product: CatalogProduct): AnyVariant[] {
  return Array.isArray(product.variants) ? (product.variants as AnyVariant[]) : [];
}

export async function autoLinkOne({
  itemId,
  sku,
  name,
}: {
  itemId: string;
  sku: string;
  name?: string;
}): Promise<AutoLinkResult> {
  try {
    const linkStore = useCatalogLink.getState();
    if (linkStore.getLink(itemId)) {
      return { kind: 'skipped', itemId, reason: 'already-linked' };
    }

    const catalogStore = useCatalog.getState();
    const product = catalogStore.getBySku(sku) as CatalogProduct | undefined;
    if (!product) {
      return { kind: 'skipped', itemId, reason: 'no-product' };
    }

    const size = parseSize(sku, name);
    const normalizedSku = sku.trim().toLowerCase();
    let bestVariant = { score: -1, sku: undefined as string | undefined };

    for (const variant of variantList(product)) {
      const variantSku = typeof variant?.sku === 'string' ? variant.sku : undefined;
      let score = 0;

      if (variantSku && variantSku.trim().toLowerCase() === normalizedSku) {
        score += 6;
      }

      const vSize = extractVariantSize(variant);
      if (size && vSize && size === vSize) {
        score += 2;
      }

      score += colorScore(variantColorName(variant), name, product.name);

      if (score > bestVariant.score) {
        bestVariant = { score, sku: variantSku };
      }
    }

    if (bestVariant.sku && bestVariant.score > 0) {
      linkStore.setLink(itemId, {
        vendor: DEFAULT_VENDOR_SLUG,
        catalogId: product.catalogId,
        variantSku: bestVariant.sku,
      });
      return { kind: 'linked-variant', itemId, variantSku: bestVariant.sku };
    }

    if (product.catalogId) {
      linkStore.setLink(itemId, {
        vendor: DEFAULT_VENDOR_SLUG,
        catalogId: product.catalogId,
      });
      return { kind: 'linked-product', itemId, catalogId: product.catalogId };
    }

    return { kind: 'skipped', itemId, reason: 'missing-catalog-id' };
  } catch (err) {
    console.error('autoLinkOne failed', err);
    const reason =
      err instanceof Error && err.message ? `error:${err.message}` : 'error';
    return {
      kind: 'skipped',
      itemId,
      reason,
    };
  }
}
