'use client';

import { create } from 'zustand';

import { useInventory } from './inventory';

export type NetworkItem = ReturnType<typeof useInventory.getState>['items'][number] & {
  partnerName: string;
  location?: string;
};

export type PartnerStock = {
  partner: string;
  location?: string;
  qty: number;
  updatedAt: string;
};

type NetworkState = {
  items: NetworkItem[];
  refresh: () => void;
  getBySku: (sku: string) => PartnerStock[] | undefined;
};

const PARTNERS = [
  { name: 'Clairity Østerbro', location: 'Østerbrogade' },
  { name: 'Clairity Vesterbro', location: 'Vesterbrogade' },
  { name: 'Clairity Aarhus', location: 'Søndergade' },
];

function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function derive(): NetworkItem[] {
  const base = useInventory.getState().items;
  if (!base?.length) return [];
  const out: NetworkItem[] = [];
  for (let i = 0; i < Math.min(50, base.length); i++) {
    const b = base[i];
    const p = PARTNERS[i % PARTNERS.length];
    const h = hash(`${b.id}:${i}`);
    const qty = h % 8;
    const updatedAt = new Date(Date.now() - (h % (12 * 3_600_000))).toISOString();
    out.push({
      ...b,
      id: `net_${p.name}_${b.id}`,
      qty,
      updatedAt,
      partnerName: p.name,
      location: p.location,
    });
  }
  return out;
}

export const useNetworkInventory = create<NetworkState>((set, get) => ({
  items: derive(),
  refresh: () => set({ items: derive() }),
  getBySku: (sku: string) => {
    if (!sku) return undefined;
    const matches = get()
      .items.filter((item) => item.sku === sku)
      .map((item) => ({
        partner: item.partnerName,
        location: item.location,
        qty: item.qty,
        updatedAt: item.updatedAt,
      }));
    return matches.length ? matches : undefined;
  },
}));
