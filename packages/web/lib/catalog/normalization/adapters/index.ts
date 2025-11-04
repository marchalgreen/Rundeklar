import type { NormalizationAdapter } from '../types';
import { moscotNormalizationAdapter } from './moscot';
import { acmeNormalizationAdapter } from './acme';
// @vendor-sdk:imports

export type AdapterEntry = NormalizationAdapter<unknown>;

const adapters: AdapterEntry[] = [
  moscotNormalizationAdapter as AdapterEntry,
    acmeNormalizationAdapter as AdapterEntry,
  // @vendor-sdk:adapters
];

const registry = new Map<string, AdapterEntry>();
for (const adapter of adapters) {
  registry.set(adapter.vendor.slug, adapter);
}

export function listNormalizationAdapters(): AdapterEntry[] {
  return Array.from(registry.values());
}

export function getNormalizationAdapter(slug: string): AdapterEntry | undefined {
  return registry.get(slug);
}
