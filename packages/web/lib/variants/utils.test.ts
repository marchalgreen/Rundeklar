import test from 'node:test';
import assert from 'node:assert/strict';

import {
  orderPhotosAngle,
  findVariantBySku,
  findVariantByColor,
  firstPhotoForColor,
} from './utils';
import type { GalleryPhoto, ProductVariant } from './types';

test('orderPhotosAngle keeps hero first and sorts remaining by priority', () => {
  const photos: GalleryPhoto[] = [
    { url: 'model.jpg', angle: 'model', color: 'Blue', isHero: false },
    { url: 'hero.jpg', angle: 'front', color: 'Black', isHero: true },
    { url: 'detail.jpg', angle: 'detail', color: 'Black', isHero: false },
    { url: 'side.jpg', angle: 'side', color: 'Black', isHero: false },
  ];

  const ordered = orderPhotosAngle(photos);

  assert.equal(ordered[0]?.url, 'hero.jpg');
  assert.deepEqual(
    ordered.slice(1).map((photo) => photo.url),
    ['side.jpg', 'model.jpg', 'detail.jpg'],
  );
});

test('findVariantBySku matches case-insensitively', () => {
  const variants: ProductVariant[] = [
    { id: 'a', sku: 'MOS-123', color: 'Black', size: '48' },
    { id: 'b', sku: 'MOS-456', color: 'Blue', size: '50' },
  ];

  assert.equal(findVariantBySku(variants, 'mos-456')?.id, 'b');
  assert.equal(findVariantBySku(variants, 'MOS-999'), undefined);
});

test('findVariantByColor prefers exact match before prefix match', () => {
  const variants: ProductVariant[] = [
    { id: 'a', sku: 'MOS-123', color: 'Black Matte', size: '48' },
    { id: 'b', sku: 'MOS-456', color: 'Black', size: '50' },
  ];

  assert.equal(findVariantByColor(variants, 'black')?.id, 'b');
  assert.equal(findVariantByColor(variants, 'black m')?.id, 'a');
  assert.equal(findVariantByColor(variants, 'rose'), undefined);
});

test('firstPhotoForColor finds the first matching index', () => {
  const photos: GalleryPhoto[] = [
    { url: 'hero.jpg', angle: 'front', color: 'Black', isHero: true },
    { url: 'alt.jpg', angle: 'side', color: 'Black Matte', isHero: false },
    { url: 'blue.jpg', angle: 'front', color: 'Blue', isHero: false },
  ];

  assert.equal(firstPhotoForColor(photos, 'black matte'), 1);
  assert.equal(firstPhotoForColor(photos, 'blue'), 2);
  assert.equal(firstPhotoForColor(photos, 'green'), undefined);
});
