import { GalleryPhoto, ProductVariant } from './types';

const ANGLE_PRIORITY = [
  'front',
  'quarter',
  'side',
  'temple',
  'model',
  'detail',
  'pack',
  'clip',
  'unknown',
];

export function normalize(input?: string | null): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  return trimmed.normalize('NFKC').toLowerCase();
}

export function tokens(input?: string | null): string[] {
  const normalized = normalize(input);
  if (!normalized) return [];
  return normalized.split(/[^a-z0-9]+/g).filter(Boolean);
}

export function orderPhotosAngle(photos: GalleryPhoto[]): GalleryPhoto[] {
  if (!photos.length) return [];

  const rest = photos.filter((photo) => !photo.isHero);
  const hero = photos.find((photo) => photo.isHero);

  const priorityMap = new Map<string, number>();
  ANGLE_PRIORITY.forEach((angle, index) => {
    priorityMap.set(angle, index);
  });

  const sorted = rest
    .slice()
    .sort((a, b) => {
      const aAngle = normalize(a.angle) || 'unknown';
      const bAngle = normalize(b.angle) || 'unknown';
      const aPriority = priorityMap.has(aAngle) ? priorityMap.get(aAngle)! : ANGLE_PRIORITY.length;
      const bPriority = priorityMap.has(bAngle) ? priorityMap.get(bAngle)! : ANGLE_PRIORITY.length;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return 0;
    });

  if (hero) {
    return [hero, ...sorted];
  }

  return sorted;
}

export function findVariantBySku(
  variants: ProductVariant[] | undefined,
  sku?: string | null,
): ProductVariant | undefined {
  if (!variants?.length) return undefined;
  if (!sku) return undefined;
  return variants.find((variant) => normalize(variant.sku) === normalize(sku));
}

export function findVariantByColor(
  variants: ProductVariant[] | undefined,
  color?: string | null,
): ProductVariant | undefined {
  if (!variants?.length) return undefined;
  const target = normalize(color);
  if (!target) return undefined;

  const exact = variants.find((variant) => normalize(variant.color) === target);
  if (exact) return exact;

  return variants.find((variant) => normalize(variant.color).startsWith(target));
}

export function firstPhotoForColor(
  photos: GalleryPhoto[] | undefined,
  color?: string | null,
): number | undefined {
  if (!photos?.length) return undefined;
  const target = normalize(color);
  if (!target) return undefined;

  for (let index = 0; index < photos.length; index += 1) {
    const photoColor = normalize(photos[index]?.color);
    if (!photoColor) continue;
    if (photoColor === target) return index;
    if (photoColor.startsWith(target)) return index;
  }
  return undefined;
}
