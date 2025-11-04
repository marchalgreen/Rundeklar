import type { z } from 'zod';

import {
  NormalizedAccessoryVariantSchema,
  NormalizedContactVariantSchema,
  NormalizedFrameVariantSchema,
  NormalizedLensVariantSchema,
  NormalizedProductSchema,
  NormalizedVariantSchema,
} from '@/lib/catalog/normalizationSchemas';

export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>;
export type NormalizedVariant = z.infer<typeof NormalizedVariantSchema>;
export type NormalizedFrameVariant = z.infer<typeof NormalizedFrameVariantSchema>;
export type NormalizedLensVariant = z.infer<typeof NormalizedLensVariantSchema>;
export type NormalizedContactVariant = z.infer<typeof NormalizedContactVariantSchema>;
export type NormalizedAccessoryVariant = z.infer<typeof NormalizedAccessoryVariantSchema>;

export type NormalizationAdapter<Input, Output extends NormalizedProduct = NormalizedProduct> = {
  /** Unique key for logging + persistence */
  key: string;
  /** Vendor metadata used by adapter */
  vendor: { slug: string; name?: string };
  /** Runtime validator for the raw payload */
  inputSchema: z.ZodType<Input>;
  /** Converts raw payload into a NormalizedProduct */
  normalize: (input: Input) => Output;
};
