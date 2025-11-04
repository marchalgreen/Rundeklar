'use client';

import * as React from 'react';
import { ProductRecord } from './types';
import {
  findVariantByColor,
  findVariantBySku,
  firstPhotoForColor,
  orderPhotosAngle,
} from './utils';

export type VariantSyncContextValue = {
  product?: ProductRecord;
  photos: ProductRecord['photos'];
  photoIndex: number;
  setPhotoIndex: (index: number) => void;
  activeVariantId?: string;
  setActiveVariantBySku: (sku?: string | null) => void;
  setActiveVariantByColor: (color?: string | null) => void;
  activeColor?: string;
  setActiveColor: (color?: string | null) => void;
};

const VariantSyncContext = React.createContext<VariantSyncContextValue | undefined>(undefined);

export type VariantSyncProviderProps = React.PropsWithChildren<{
  product?: ProductRecord;
  initial?: {
    variantSku?: string;
    color?: string;
  };
}>;

export function VariantSyncProvider({ product, initial, children }: VariantSyncProviderProps) {
  const photos = React.useMemo(() => orderPhotosAngle(product?.photos ?? []), [product]);

  const [photoIndex, setPhotoIndexState] = React.useState(0);
  const [activeVariantId, setActiveVariantId] = React.useState<string | undefined>();
  const [activeColor, setActiveColorState] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!photos.length) {
      setPhotoIndexState(0);
      return;
    }
    setPhotoIndexState((prev) => {
      if (prev < 0) return 0;
      if (prev >= photos.length) return photos.length - 1;
      return prev;
    });
  }, [photos.length]);

  React.useEffect(() => {
    if (!product) {
      setActiveVariantId(undefined);
      setActiveColorState(undefined);
      setPhotoIndexState(0);
      return;
    }
    const variantExists = product.variants.some((variant) => variant.id === activeVariantId);
    if (!variantExists) {
      setActiveVariantId(undefined);
    }
  }, [product, activeVariantId]);

  const setPhotoIndex = React.useCallback(
    (index: number) => {
      if (!photos.length) {
        setPhotoIndexState(0);
        return;
      }
      const upperBound = photos.length - 1;
      const nextIndex = Math.max(0, Math.min(index, upperBound));
      setPhotoIndexState(nextIndex);
    },
    [photos.length],
  );

  const setActiveColor = React.useCallback((color?: string | null) => {
    if (!color) {
      setActiveColorState(undefined);
      return;
    }
    setActiveColorState(color);
  }, []);

  const setActiveVariantBySku = React.useCallback(
    (sku?: string | null) => {
      if (!product) return;
      if (!sku) return;
      const match = findVariantBySku(product.variants, sku);
      if (!match) return;
      setActiveVariantId(match.id);
      const variantColor = match.color;
      if (variantColor) {
        setActiveColorState(variantColor);
        const candidateIndex = firstPhotoForColor(photos, variantColor);
        if (typeof candidateIndex === 'number') {
          setPhotoIndex(candidateIndex);
        }
      }
    },
    [product, photos, setPhotoIndex],
  );

  const setActiveVariantByColor = React.useCallback(
    (color?: string | null) => {
      if (!product) return;
      if (!color) {
        setActiveColorState(undefined);
        setActiveVariantId(undefined);
        return;
      }
      setActiveColorState(color);
      const match = findVariantByColor(product.variants, color);
      if (match) {
        setActiveVariantId(match.id);
      }
      const candidateIndex = firstPhotoForColor(photos, color);
      if (typeof candidateIndex === 'number') {
        setPhotoIndex(candidateIndex);
      }
    },
    [product, photos, setPhotoIndex],
  );

  const initialVariantSku = initial?.variantSku;
  const initialColor = initial?.color;

  React.useEffect(() => {
    if (!product) return;

    if (initialVariantSku) {
      setActiveVariantBySku(initialVariantSku);
      return;
    }

    if (initialColor) {
      setActiveVariantByColor(initialColor);
    }
  }, [product, initialVariantSku, initialColor, setActiveVariantBySku, setActiveVariantByColor]);

  const value = React.useMemo<VariantSyncContextValue>(
    () => ({
      product,
      photos,
      photoIndex,
      setPhotoIndex,
      activeVariantId,
      setActiveVariantBySku,
      setActiveVariantByColor,
      activeColor,
      setActiveColor,
    }),
    [
      product,
      photos,
      photoIndex,
      setPhotoIndex,
      activeVariantId,
      setActiveVariantBySku,
      setActiveVariantByColor,
      activeColor,
      setActiveColor,
    ],
  );

  return <VariantSyncContext.Provider value={value}>{children}</VariantSyncContext.Provider>;
}

export function useVariantSync(): VariantSyncContextValue {
  const ctx = React.useContext(VariantSyncContext);
  if (!ctx) {
    throw new Error('useVariantSync must be used within a VariantSyncProvider');
  }
  return ctx;
}
