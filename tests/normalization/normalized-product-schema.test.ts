import assert from 'node:assert/strict';
import test from 'node:test';

import { NormalizedProductSchema } from '@/lib/catalog/normalizationSchemas';

const baseProduct = {
  vendor: { slug: 'moscot', name: 'MOSCOT' },
  catalogId: 'TEST',
  category: 'Frames',
  source: {},
  photos: [],
  variants: [
    {
      type: 'frame',
      id: 'TEST:variant',
    },
  ],
} as const;

test('NormalizedProductSchema accepts minimal valid frame product', () => {
  const parsed = NormalizedProductSchema.parse(baseProduct);
  assert.equal(parsed.catalogId, 'TEST');
  assert.equal(parsed.variants.length, 1);
});

test('NormalizedProductSchema rejects mismatched variant type', () => {
  assert.throws(() =>
    NormalizedProductSchema.parse({
      ...baseProduct,
      category: 'Accessories',
    }),
  );
});
