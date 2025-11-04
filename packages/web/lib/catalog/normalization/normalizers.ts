import { ZodError } from 'zod';

import { NormalizedProductSchema } from '@/lib/catalog/normalizationSchemas';

import type { NormalizedProduct } from './types';
import {
  getNormalizationAdapter as lookupAdapter,
  listNormalizationAdapters,
  type AdapterEntry,
} from './adapters';

export { listNormalizationAdapters };

export class NormalizationAdapterNotFoundError extends Error {
  constructor(slug: string) {
    super(`No normalization adapter registered for vendor ${slug}`);
    this.name = 'NormalizationAdapterNotFoundError';
  }
}

export class NormalizationInputError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NormalizationInputError';
    this.cause = cause;
  }
}

export class NormalizationOutputError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NormalizationOutputError';
    this.cause = cause;
  }
}

export class NormalizationExecutionError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NormalizationExecutionError';
    this.cause = cause;
  }
}

export function getNormalizationAdapter(slug: string): AdapterEntry | undefined {
  return lookupAdapter(slug);
}

export function normalizeVendorItem(slug: string, payload: unknown): NormalizedProduct {
  const adapter = getNormalizationAdapter(slug);
  if (!adapter) {
    throw new NormalizationAdapterNotFoundError(slug);
  }

  let parsedInput: unknown;
  try {
    parsedInput = adapter.inputSchema.parse(payload);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new NormalizationInputError(`Invalid payload for adapter ${adapter.key}`, err);
    }
    throw err;
  }

  let normalized: NormalizedProduct;
  try {
    normalized = adapter.normalize(parsedInput);
  } catch (err) {
    throw new NormalizationExecutionError(`Adapter ${adapter.key} failed to normalize payload`, err);
  }

  try {
    return NormalizedProductSchema.parse(normalized);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new NormalizationOutputError(`Adapter ${adapter.key} produced invalid normalized product`, err);
    }
    throw err;
  }
}
