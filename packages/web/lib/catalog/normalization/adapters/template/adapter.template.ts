import { z } from 'zod';

import type {
  NormalizedProduct,
  NormalizationAdapter,
} from '@/lib/catalog/normalization/types';

/**
 * Replace the schema + normalization logic with the vendor-specific implementation.
 * The CLI fills in vendor metadata during scaffolding.
 */
export const __RAW_SCHEMA_NAME__ = z
  .object({
    // Define the vendor's raw catalog schema here
  })
  .passthrough();

export type __RAW_TYPE_NAME__ = z.infer<typeof __RAW_SCHEMA_NAME__>;

export function __NORMALIZE_FN__(input: __RAW_TYPE_NAME__): NormalizedProduct {
  // Map the vendor payload into the NormalizedProduct shape
  throw new Error('normalize() not implemented for __VENDOR_SLUG__');
}

export const __ADAPTER_CONST__: NormalizationAdapter<__RAW_TYPE_NAME__> = {
  key: '__VENDOR_SLUG__',
  vendor: {
    slug: '__VENDOR_SLUG__',
    name: '__VENDOR_NAME__',
  },
  inputSchema: __RAW_SCHEMA_NAME__,
  normalize: __NORMALIZE_FN__,
};
