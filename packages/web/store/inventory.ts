// src/store/inventory.ts
'use client';

import { create } from 'zustand';

import { useInventoryMovements } from './inventoryMovements';

// Pulls base mock + optional demo catalog (de-duped by SKU)
// If you haven’t added loadInventory.ts yet, add it first (see earlier step)
import { INITIAL_INVENTORY } from '@/lib/mock/loadInventory';

/** Domain types */
export type InventoryCategory =
  | 'Frames'
  | 'Sunglasses'
  | 'Lenses'
  | 'Accessories'
  | 'Contacts';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  qty: number;
  barcode?: string;
  updatedAt: string; // ISO or human-friendly string

  // explicit projection fields (filled by importer)
  brand?: string; // e.g. "MOSCOT"
  model?: string; // e.g. "LEMTOSH"
  color?: string; // e.g. "Tortoise"
  sizeLabel?: string; // e.g. "46"
  usage?: 'optical' | 'sun' | 'both';
}

export type AdjustmentReason = 'Stock take' | 'Received' | 'Damaged' | 'Returned' | 'Correction';

interface LastAction {
  token: string;
  itemId: string;
  prevQty: number;
  nextQty: number;
  delta: number;
  reason: AdjustmentReason;
  note?: string;
  at: string; // ISO
}

interface InventoryState {
  items: InventoryItem[];

  setItems: (items: InventoryItem[] | ((prev: InventoryItem[]) => InventoryItem[])) => void;

  adjustQty: (id: string, delta: number) => void;

  variantEdits: Record<string, Record<string, string>>;
  setVariantEdit: (variantId: string, field: string, value: string) => void;
  clearVariantEdits: (variantId?: string) => void;

  // M3 additions (kept intact)
  adjustWithReason: (opts: {
    id: string;
    amount: number; // can be negative
    reason: AdjustmentReason;
    note?: string;
  }) => { token: string } | null;

  undoLast: (token: string) => void;
  _last?: LastAction;
}

/* -------------------- Helpers -------------------- */

const nowISO = () => new Date().toISOString();

/**
 * Your original mock generator (kept as fallback).
 * If the demo file is missing, we’ll generate the classic 120 items.
 */
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeBarcode(num: number, len = 13): string {
  const s = String(num);
  return s.length >= len ? s.slice(0, len) : s.padEnd(len, '0');
}

function id(prefix: string, i: number) {
  return `${prefix}_${i.toString().padStart(3, '0')}`;
}

function generateMockInventory(total = 120): InventoryItem[] {
  const framesBase = [
    ['RB-3025-58', 'Ray-Ban Aviator 58mm'],
    ['RB-WAY-54', 'Ray-Ban Wayfarer 54'],
    ['OK-HOLBROOK', 'Oakley Holbrook'],
    ['OK-FROG', 'Oakley Frogskins'],
    ['PR-01V-52', 'Prada PR 01V 52'],
    ['GU-123-51', 'Gucci GG0123 51'],
    ['AR-2021-53', 'Armani AR 2021 53'],
    ['CK-145-50', 'Calvin Klein CK145 50'],
  ];

  const lensBase = [
    ['ESL-16-UC', 'Essilor 1.6 Uncoated (pair)'],
    ['ESL-16-CLEAR', 'Essilor 1.6 Crizal'],
    ['ESL-167-BLK', 'Essilor 1.67 Thin'],
    ['HZ-Blue-Guard', 'Hoya BlueControl'],
    ['HZ-HiVision', 'Hoya Hi-Vision LongLife'],
    ['ZE-DriveSafe', 'ZEISS DriveSafe'],
    ['ZE-Digital', 'ZEISS Digital Lenses'],
    ['NA-Std-CR39', 'Nikon CR-39 Standard'],
  ];

  const accBase = [
    ['ACC-CASE-BLACK', 'Hard Case (Black)'],
    ['ACC-CASE-TAUPE', 'Hard Case (Taupe)'],
    ['ACC-CLOTH-TAHOE', 'Tahoe Microfiber Cloth'],
    ['ACC-SPRAY-60', 'Lens Cleaning Spray 60ml'],
    ['ACC-SPRAY-120', 'Lens Cleaning Spray 120ml'],
    ['ACC-NOSE-PAD', 'Nose Pads (pair)'],
    ['ACC-SCREW-KIT', 'Mini Screw Kit'],
    ['ACC-STRING', 'Spectacle Cord'],
  ];

  const frameColors = ['Black', 'Tortoise', 'Gold', 'Silver', 'Blue'];
  const lensTreatments = ['UC', 'Crizal', 'BlueGuard', 'Photochromic'];
  const clothColors = ['Tahoe Blue', 'Charcoal', 'Sand'];

  const items: InventoryItem[] = [];
  const eachBucket = Math.max(1, Math.floor(total / 3));

  // FRAMES
  let idx = 1;
  for (let i = 0; i < eachBucket; i++) {
    const base = framesBase[i % framesBase.length];
    const color = frameColors[i % frameColors.length];
    const sku = `${base[0]}-${color.slice(0, 2).toUpperCase()}`;
    const qty = i % 11 === 0 ? 0 : i % 7 === 0 ? 2 : i % 5 === 0 ? 58 : 12 + (i % 9);
    const bc = i % 9 === 0 ? undefined : makeBarcode(8053672676000 + i);
    items.push({
      id: id('inv', idx++),
      sku,
      name: `${base[1]} — ${color}`,
      category: 'Frames',
      qty,
      barcode: bc,
      updatedAt: daysAgoISO(i % 30),
    });
  }

  // LENSES
  for (let i = 0; i < eachBucket; i++) {
    const base = lensBase[i % lensBase.length];
    const treat = lensTreatments[i % lensTreatments.length];
    const sku = `${base[0]}-${treat.toUpperCase()}`;
    const qty = i % 10 === 0 ? 0 : i % 6 === 0 ? 3 : i % 4 === 0 ? 75 : 10 + (i % 8);
    const bc = i % 8 === 0 ? undefined : makeBarcode(200000000000 + i);
    items.push({
      id: id('inv', idx++),
      sku,
      name: `${base[1]} — ${treat}`,
      category: 'Lenses',
      qty,
      barcode: bc,
      updatedAt: daysAgoISO((i + 3) % 30),
    });
  }

  // ACCESSORIES
  for (let i = 0; i < eachBucket; i++) {
    const base = accBase[i % accBase.length];
    let sku = base[0];
    let name = base[1];

    if (sku.startsWith('ACC-CLOTH')) {
      const clr = clothColors[i % clothColors.length];
      sku = `${sku}-${clr.split(' ')[0].toUpperCase()}`;
      name = `${name} — ${clr}`;
    }

    const qty = i % 12 === 0 ? 0 : i % 5 === 0 ? 4 : i % 3 === 0 ? 120 : 15 + (i % 11);
    const bc = i % 7 === 0 ? undefined : makeBarcode(300000000000 + i);
    items.push({
      id: id('inv', idx++),
      sku,
      name,
      category: 'Accessories',
      qty,
      barcode: bc,
      updatedAt: daysAgoISO((i + 7) % 30),
    });
  }

  while (items.length < total) {
    const i = items.length;
    items.push({
      id: id('inv', idx++),
      sku: `GEN-${i.toString().padStart(4, '0')}`,
      name: `Generic Item ${i}`,
      category: (i % 3 === 0
        ? 'Frames'
        : i % 3 === 1
          ? 'Lenses'
          : 'Accessories') as InventoryCategory,
      qty: i % 9 === 0 ? 0 : (i % 6) + 6,
      barcode: i % 10 === 0 ? undefined : makeBarcode(900000000000 + i),
      updatedAt: daysAgoISO(i % 30),
    });
  }

  return items;
}

/* -------------------- Initial items -------------------- */

/**
 * Use demo+base inventory if available; otherwise fall back to classic generator.
 * (INITIAL_INVENTORY comes from src/lib/mock/loadInventory.ts)
 */
const initialItems: InventoryItem[] =
  Array.isArray(INITIAL_INVENTORY) && INITIAL_INVENTORY.length > 0
    ? (INITIAL_INVENTORY as InventoryItem[])
    : generateMockInventory(120);

/* -------------------- Store -------------------- */

export const useInventory = create<InventoryState>((set, get) => ({
  items: initialItems,
  variantEdits: {},

  setItems: (itemsOrFn) =>
    set((state) => ({
      items:
        typeof itemsOrFn === 'function'
          ? (itemsOrFn as (prev: InventoryItem[]) => InventoryItem[])(state.items)
          : itemsOrFn,
    })),

  adjustQty: (id, delta) =>
    set((s) => {
      if (delta === 0) return {};

      const target = s.items.find((it) => it.id === id);
      if (!target) return {};

      const prevQty = target.qty;
      const prevUpdatedAt = target.updatedAt;
      const nextQty = Math.max(0, prevQty + Math.round(delta));
      const normalizedDelta = nextQty - prevQty;
      if (normalizedDelta === 0) return {};

      const at = nowISO();

      useInventoryMovements.getState().append({
        itemId: id,
        delta: normalizedDelta,
        reason: 'Correction',
        atISO: at,
      });

      (async () => {
        try {
          const res = await fetch('/api/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, delta: normalizedDelta }),
            cache: 'no-store',
          });
          const payload = await res.json().catch(() => null);
          if (!res.ok) {
            const message = String((payload as any)?.error ?? res.statusText);
            throw new Error(message || 'adjust_failed');
          }
          const serverQty = Number((payload as any)?.qty);
          const serverAt =
            typeof (payload as any)?.updatedAt === 'string' ? (payload as any).updatedAt : at;
          if (Number.isFinite(serverQty)) {
            set((curr) => ({
              items: curr.items.map((it) =>
                it.id === id ? { ...it, qty: serverQty, updatedAt: serverAt } : it,
              ),
            }));
          }
        } catch (err) {
          set((curr) => ({
            items: curr.items.map((it) =>
              it.id === id ? { ...it, qty: prevQty, updatedAt: prevUpdatedAt } : it,
            ),
          }));
          useInventoryMovements.getState().appendUndo({
            itemId: id,
            delta: -normalizedDelta,
            note: 'Rollback: server rejected justering',
            atISO: nowISO(),
          });
          console.warn('[inventory] adjust failed — rolled back', err);
        }
      })();

      return {
        items: s.items.map((it) =>
          it.id === id ? { ...it, qty: nextQty, updatedAt: at } : it,
        ),
      };
    }),

  adjustWithReason: ({ id, amount, reason, note }) => {
    const s = get();
    const item = s.items.find((x) => x.id === id);
    if (!item) return null;

    const prevQty = item.qty;
    const prevUpdatedAt = item.updatedAt;
    const prevLast = s._last;
    const normalizedAmount = Math.round(amount);
    const nextQty = Math.max(0, prevQty + normalizedAmount);
    const delta = nextQty - prevQty;
    if (delta === 0) return null;

    const token = crypto.randomUUID();
    const at = nowISO();

    set({
      items: s.items.map((it) => (it.id === id ? { ...it, qty: nextQty, updatedAt: at } : it)),
      _last: { token, itemId: id, prevQty, nextQty, delta, reason, note, at },
    });

    useInventoryMovements.getState().append({
      itemId: id,
      delta,
      reason,
      note,
      atISO: at,
    });

    (async () => {
      try {
        const res = await fetch('/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, delta, reason, note }),
          cache: 'no-store',
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const message = String((payload as any)?.error ?? res.statusText);
          throw new Error(message || 'adjust_failed');
        }
        const serverQty = Number((payload as any)?.qty);
        const serverAt =
          typeof (payload as any)?.updatedAt === 'string' ? (payload as any).updatedAt : at;
        if (Number.isFinite(serverQty)) {
          set((curr) => {
            const nextState: Partial<InventoryState> = {
              items: curr.items.map((it) =>
                it.id === id ? { ...it, qty: serverQty, updatedAt: serverAt } : it,
              ),
            };
            if (curr._last && curr._last.token === token) {
              nextState._last = {
                ...curr._last,
                nextQty: serverQty,
                delta: serverQty - prevQty,
                at: serverAt,
              };
            }
            return nextState;
          });
        }
      } catch (err) {
        set((curr) => {
          const shouldRestoreLast = curr._last && curr._last.token === token;
          const nextState: Partial<InventoryState> = {
            items: curr.items.map((it) =>
              it.id === id ? { ...it, qty: prevQty, updatedAt: prevUpdatedAt } : it,
            ),
          };
          if (shouldRestoreLast) {
            nextState._last = prevLast ?? undefined;
          }
          return nextState;
        });
        useInventoryMovements.getState().appendUndo({
          itemId: id,
          delta: -delta,
          note: reason ? `Rollback: ${reason}` : 'Rollback: server rejected justering',
          atISO: nowISO(),
        });
        console.warn('[inventory] adjustWithReason failed — rolled back', err);
      }
    })();

    return { token };
  },

  undoLast: (token) => {
    const s = get();
    if (!s._last || s._last.token !== token) return;
    const last = s._last;
    const { itemId, prevQty } = last;
    const at = nowISO();

    set({
      items: s.items.map((it) =>
        it.id === itemId ? { ...it, qty: prevQty, updatedAt: at } : it,
      ),
      _last: undefined,
    });

    useInventoryMovements.getState().appendUndo({
      itemId,
      delta: -last.delta,
      note: last.note ? `Undo: ${last.note}` : undefined,
      atISO: at,
    });
  },

  setVariantEdit: (variantId, field, value) =>
    set((state) => {
      const prevVariant = state.variantEdits[variantId] ?? {};
      const nextFields = { ...prevVariant };

      if (value === '') {
        delete nextFields[field];
      } else {
        nextFields[field] = value;
      }

      const nextMap = { ...state.variantEdits };
      if (Object.keys(nextFields).length === 0) {
        delete nextMap[variantId];
      } else {
        nextMap[variantId] = nextFields;
      }

      return { variantEdits: nextMap };
    }),

  clearVariantEdits: (variantId) =>
    set((state) => {
      if (!variantId) {
        return { variantEdits: {} };
      }

      if (!state.variantEdits[variantId]) return {};

      const next = { ...state.variantEdits };
      delete next[variantId];
      return { variantEdits: next };
    }),
}));

// Client-side hydrate from /api/inventory (non-blocking; mock remains fallback)
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const res = await fetch('/api/inventory', { cache: 'no-store' });
      if (!res.ok) return;
      const j = await res.json();
      const apiItems = Array.isArray(j?.items) ? (j.items as InventoryItem[]) : [];
      if (apiItems.length > 0) {
        useInventory.setState({ items: apiItems });
      }
    } catch {
      // swallow errors; demo can keep using mock
    }
  })();
}
