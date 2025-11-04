import { CatalogProduct, CatalogPhoto } from '@/types/product';
import { GalleryPhoto, ProductRecord, ProductVariant } from '../types';

function toGalleryPhoto(photo: CatalogPhoto): GalleryPhoto {
  return {
    url: photo.url,
    label: photo.label,
    angle: photo.angle,
    color: photo.colorwayName,
    isHero: photo.isHero,
  };
}

function toVariant(entry: unknown): ProductVariant | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const idValue = (entry as { id?: unknown }).id;
  if (typeof idValue !== 'string' && typeof idValue !== 'number') return undefined;
  const variant: ProductVariant = { id: String(idValue) };

  const skuValue = (entry as { sku?: unknown }).sku;
  if (typeof skuValue === 'string' && skuValue.trim().length > 0) {
    variant.sku = skuValue;
  }

  const colorValue =
    (entry as { color?: { name?: unknown } }).color?.name ??
    (entry as { color?: unknown }).color;
  if (typeof colorValue === 'string' && colorValue.trim().length > 0) {
    variant.color = colorValue;
  }

  const sizeLabelValue = (entry as { sizeLabel?: unknown }).sizeLabel;
  if (typeof sizeLabelValue === 'string' && sizeLabelValue.trim().length > 0) {
    variant.size = sizeLabelValue;
  }

  return variant;
}

/**
 * Temporary adapter that maps our legacy CatalogProduct into the new variant domain model.
 * The current catalog data is vendor-specific; once we receive B2B feeds this layer will be replaced.
 */
export function toProductRecord(catalogProduct: CatalogProduct | undefined | null): ProductRecord {
  if (!catalogProduct) {
    return {
      id: 'unknown',
      brand: undefined,
      model: undefined,
      name: undefined,
      variants: [],
      photos: [],
    };
  }

  let identifier: string | undefined;
  if (typeof catalogProduct.catalogId === 'string' && catalogProduct.catalogId.length > 0) {
    identifier = catalogProduct.catalogId;
  } else if ('id' in catalogProduct) {
    const rawId = (catalogProduct as { id?: unknown }).id;
    if (typeof rawId === 'string' && rawId.length > 0) {
      identifier = rawId;
    }
  }
  const recordId = identifier ?? 'unknown';

  const rawVariants = (catalogProduct as { variants?: unknown }).variants;
  const variants: ProductVariant[] = Array.isArray(rawVariants)
    ? rawVariants
        .map((entry) => toVariant(entry))
        .filter((entry): entry is ProductVariant => Boolean(entry))
    : [];

  const photos: GalleryPhoto[] = Array.isArray(catalogProduct.photos)
    ? catalogProduct.photos.map((photo) => toGalleryPhoto(photo))
    : [];

  return {
    id: recordId,
    brand: catalogProduct.brand,
    model: catalogProduct.model,
    name: catalogProduct.name,
    variants,
    photos,
  };
}
