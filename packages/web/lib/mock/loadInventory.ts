// src/lib/mock/loadInventory.ts
/**
 * Merge your existing mock inventory with the demo catalog import.
 * - Reads: ./inventory (named or default export)
 * - Optional: ./inventory.demo.json (written by scripts/import-demo-catalog.ts)
 * - Controlled by env NEXT_PUBLIC_INCLUDE_DEMO (default: include if file exists)
 */

import * as baseModule from '@/lib/mock/inventory';
import demoJson from '@/lib/mock/inventory.demo.json';

/** Minimal item shape your UI expects (same as store). */
export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  qty: number;
  barcode?: string;
  updatedAt: string;
};

/* ---------------- resolve base items (named or default) ---------------- */

function pickBaseArray(mod: Record<string, unknown>): InventoryItem[] {
  // try common names first
  const candidate =
    (mod as any).mockInventory ??
    (mod as any).items ??
    (mod as any).default ?? // if someone did export default [...]
    null;

  if (Array.isArray(candidate)) return candidate as InventoryItem[];

  // Some repos export a generator instead of data
  if (typeof (mod as any).generateMockInventory === 'function') {
    try {
      const gen = (mod as any).generateMockInventory;
      const arr = gen(120);
      if (Array.isArray(arr)) return arr as InventoryItem[];
    } catch {
      // ignore
    }
  }

  // Last resort: nothing found
  return [];
}

const BASE: InventoryItem[] = pickBaseArray(baseModule);

/* ---------------- read optional demo file ---------------- */

const DEMO: InventoryItem[] = Array.isArray(demoJson as any)
  ? (demoJson as any as InventoryItem[])
  : [];

/* ---- feature flag (default ON if demo has content) ---- */

const INCLUDE_DEMO =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_INCLUDE_DEMO === '1') ||
  (DEMO && DEMO.length > 0);

/* ---------------- helpers ---------------- */

function dedupeBySku(items: InventoryItem[]): InventoryItem[] {
  const map = new Map<string, InventoryItem>();
  for (const it of items) {
    const key = (it.sku || '').toLowerCase();
    if (!map.has(key)) map.set(key, it);
    else {
      // prefer demo row on conflict (so demo wins)
      // we know if an incoming item came from DEMO by id prefix
      const existing = map.get(key)!;
      if ((it.id || '').startsWith('demo_')) map.set(key, it);
      else map.set(key, existing);
    }
  }
  return [...map.values()];
}

/* ---------------- final export ---------------- */

export const INITIAL_INVENTORY: InventoryItem[] = INCLUDE_DEMO
  ? dedupeBySku([...BASE, ...DEMO])
  : BASE;
