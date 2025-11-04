// src/store/catalogLink.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Vendor identifier (slug). Start with "moscot"; add others later (e.g., "luxottica", "essilor").
 */
export type CatalogVendor = 'moscot' | string;

/**
 * A lightweight link from a local inventory item → a vendor catalog record.
 * - catalogId: product-level identifier (e.g., MOSCOT handle "lemtosh")
 * - variantSku: optional variant-level sku (e.g., "lemtosh-Burgundy-49")
 */
export type CatalogLink = {
  vendor: CatalogVendor;
  catalogId?: string;
  variantSku?: string;
  linkedAt: string; // ISO
  note?: string; // optional free text
};

/**
 * We store links keyed by local InventoryItem.id
 */
export type CatalogLinkState = {
  links: Record<string, CatalogLink | undefined>;

  /** Get link for a given local inventory item id */
  getLink: (itemId: string) => CatalogLink | undefined;

  /** Create/replace link for the item */
  setLink: (
    itemId: string,
    link: Omit<CatalogLink, 'linkedAt'> & Partial<Pick<CatalogLink, 'linkedAt'>>,
  ) => void;

  /** Remove link */
  unlink: (itemId: string) => void;

  /** Convenience: upsert link by fields (vendor + ids), generating linkedAt automatically if missing */
  linkTo: (opts: {
    itemId: string;
    vendor: CatalogVendor;
    catalogId?: string;
    variantSku?: string;
    note?: string;
  }) => void;

  /** Bulk ops (useful for demo import) */
  setMany: (entries: Array<{ itemId: string; link: CatalogLink }>) => void;

  /** Delete everything (dev) */
  clearAll: () => void;
};

/**
 * Persistent store (localStorage) so links survive reloads and demos.
 */
export const useCatalogLink = create<CatalogLinkState>()(
  persist(
    (set, get) => ({
      links: {},

      getLink: (itemId) => get().links[itemId],

      setLink: (itemId, link) =>
        set((s) => {
          const next: CatalogLink = {
            linkedAt: link.linkedAt ?? new Date().toISOString(),
            vendor: link.vendor,
            catalogId: link.catalogId,
            variantSku: link.variantSku,
            note: link.note,
          };
          return { links: { ...s.links, [itemId]: next } };
        }),

      unlink: (itemId) =>
        set((s) => {
          if (!(itemId in s.links)) return s;
          const { [itemId]: _drop, ...rest } = s.links;
          return { links: rest };
        }),

      linkTo: ({ itemId, vendor, catalogId, variantSku, note }) =>
        get().setLink(itemId, { vendor, catalogId, variantSku, note }),

      setMany: (entries) =>
        set((s) => {
          const merged = { ...s.links };
          for (const { itemId, link } of entries) merged[itemId] = link;
          return { links: merged };
        }),

      clearAll: () => set({ links: {} }),
    }),
    {
      name: 'clairity-catalog-links',
      version: 1,
      // optional migrate for future shapes
      migrate: (persisted, _version) => persisted as CatalogLinkState,
      // only store minimal data
      partialize: (s) => ({ links: s.links }),
    },
  ),
);
