// src/lib/catalog/normalization/adapters/hasAdapter.ts
import { getNormalizationAdapter } from './index';

/**
 * Checks if a normalization adapter exists for the given vendor slug.
 * Uses the registry from adapters/index.ts (O(1) lookup).
 */
export function hasAdapter(slug?: string | null): boolean {
  if (!slug) return false;
  const normalized = slug.trim().toLowerCase();
  try {
    return !!getNormalizationAdapter(normalized);
  } catch {
    return false;
  }
}
