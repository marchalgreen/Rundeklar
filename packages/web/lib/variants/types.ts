export type ColorName = string;
export type SizeLabel = string;
export type Sku = string;
export type VariantId = string;
export type ProductId = string;

export type GalleryPhoto = {
  url: string;
  label?: string;
  angle?: string;
  color?: ColorName;
  isHero?: boolean;
};

export type ProductVariant = {
  id: VariantId;
  sku?: Sku;
  color?: ColorName;
  size?: SizeLabel;
};

export type ProductRecord = {
  id: ProductId;
  brand?: string;
  model?: string;
  name?: string;
  variants: ProductVariant[];
  photos: GalleryPhoto[];
};
