// src/store/inventoryMovements.ts
'use client';

import { create } from 'zustand';

import type { AdjustmentReason } from './inventory';

export interface InventoryMovementEntry {
  id: string;
  itemId: string;
  delta: number;
  reason: AdjustmentReason;
  note?: string;
  atISO: string;
  qtyBefore?: number;
  qtyAfter?: number;
}

type MovementDraft = Omit<InventoryMovementEntry, 'id'> & { id?: string };

interface InventoryMovementsState {
  entries: InventoryMovementEntry[];
  append: (entry: MovementDraft) => InventoryMovementEntry;
  appendMany: (entries: MovementDraft[]) => InventoryMovementEntry[];
  appendUndo: (entry: Omit<MovementDraft, 'reason'>) => InventoryMovementEntry;
  getByItem: (itemId: string) => InventoryMovementEntry[];
  clear: () => void;
}

export const useInventoryMovements = create<InventoryMovementsState>((set, get) => ({
  entries: [],
  append: (entry) => {
    const record: InventoryMovementEntry = {
      ...entry,
      id: entry.id ?? crypto.randomUUID(),
    };

    set((state) => ({ entries: [record, ...state.entries] }));

    return record;
  },
  appendMany: (entries) => {
    if (!entries.length) return [];

    const records: InventoryMovementEntry[] = entries.map((entry) => ({
      ...entry,
      id: entry.id ?? crypto.randomUUID(),
    }));

    const incomingIds = new Set(records.map((entry) => entry.id));
    set((state) => ({
      entries: [
        ...records,
        ...state.entries.filter((existing) => !incomingIds.has(existing.id)),
      ],
    }));

    return records;
  },
  appendUndo: (entry) =>
    get().append({
      ...entry,
      reason: 'Correction',
    }),
  getByItem: (itemId) => get().entries.filter((entry) => entry.itemId === itemId),
  clear: () => set({ entries: [] }),
}));
