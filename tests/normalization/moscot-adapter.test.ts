import assert from 'node:assert/strict';
import test from 'node:test';

import { NormalizedProductSchema } from '@/lib/catalog/normalizationSchemas';
import { normalizeVendorItem } from '@/lib/catalog/normalization/normalizers';
import { normalizeMoscotProduct } from '@/lib/catalog/normalization/adapters/moscot';
import { MoscotAccessorySample, MoscotRawSample } from '../mocks/catalogSamples';

test('normalizeMoscotProduct maps frames to NormalizedProduct', () => {
  const normalized = normalizeMoscotProduct(MoscotRawSample);
  const validated = NormalizedProductSchema.parse(normalized);

  assert.equal(validated.vendor.slug, 'moscot');
  assert.equal(validated.category, 'Frames');
  assert.equal(validated.variants.length, 2);
  assert.equal(validated.variants[0].type, 'frame');
  assert.equal(validated.variants[0].measurements?.lensWidth, 46);
  assert.equal(validated.photos.length, 2);
  assert.equal(validated.price?.amount, 295);
});

test('normalizeVendorItem resolves MOSCOT adapter and validates output', () => {
  const normalized = normalizeVendorItem('moscot', MoscotAccessorySample);
  assert.equal(normalized.category, 'Accessories');
  assert.equal(normalized.variants[0].type, 'accessory');
});
