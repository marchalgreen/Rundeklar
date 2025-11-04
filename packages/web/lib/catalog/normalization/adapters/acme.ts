import { z } from 'zod';
import {
  NormalizedProductSchema,
  NormalizedCategorySchema,
  NormalizedPhotoSchema,
} from '@/lib/catalog/normalizationSchemas';
import type {
  NormalizedProduct,
  NormalizationAdapter,
  NormalizedVariant,
} from '@/lib/catalog/normalization/types';
import { vendorLabel } from '@/lib/catalog/vendorSlugs';

// Basic vendor schema: only catalogId + category required
export const AcmeRawProductSchema = z
  .object({
    catalogId: z.string().min(1),
    category: z.string().min(1),
    name: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          type: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export type AcmeRawProduct = z.infer<typeof AcmeRawProductSchema>;

function buildFallbackVariant(
  category: NormalizedProduct['category'],
  catalogId: string,
): NormalizedVariant {
  const map = { Frames: 'frame', Lenses: 'lens', Contacts: 'contact', Accessories: 'accessory' };
  const type = map[category] || 'accessory';
  return { id: `${catalogId}:variant`, type } as NormalizedVariant;
}

export function normalizeAcmeProduct(raw: AcmeRawProduct): NormalizedProduct {
  // Convert vendor category string → known NormalizedCategory
  const catParse = NormalizedCategorySchema.safeParse(raw.category);
  const category = catParse.success ? catParse.data : 'Accessories';

  const vendor = 'acme';
  const label = vendorLabel(vendor) ?? 'Acme';

  const variants =
    Array.isArray(raw.variants) && raw.variants.length > 0
      ? raw.variants.map((v, i) => ({
          id: v.id ?? `${raw.catalogId}:v${i}`,
          type: (v.type as NormalizedVariant['type']) ?? 'frame',
        }))
      : [buildFallbackVariant(category, raw.catalogId)];

  const normalized: NormalizedProduct = {
    vendor: { slug: vendor, name: label },
    catalogId: raw.catalogId,
    name: raw.name ?? raw.catalogId,
    brand: raw.brand ?? 'ACME',
    model: raw.model ?? undefined,
    category,
    photos: [],
    source: {},
    variants,
    extras: undefined,
    raw,
  };

  return NormalizedProductSchema.parse(normalized);
}

export const acmeNormalizationAdapter: NormalizationAdapter<AcmeRawProduct> = {
  key: 'acme.catalog',
  vendor: { slug: 'acme', name: 'Acme' },
  inputSchema: AcmeRawProductSchema,
  normalize: normalizeAcmeProduct,
};
