// src/store/purchaseRequests.ts
'use client';

import { create } from 'zustand';
import { useInventory } from './inventory';
import { useInventoryMovements } from './inventoryMovements';

export type PurchaseRequestStatus = 'draft' | 'received';

export interface PurchaseRequestLine {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  qty: number;
  supplierHint?: string | null;
}

export interface PurchaseRequestDraft {
  id: string;
  label: string;
  supplierHint?: string | null;
  contactEmail?: string | null;
  note?: string | null;
  status: PurchaseRequestStatus;
  createdAt: string;
  updatedAt: string;
  receivedAt?: string;
  lines: PurchaseRequestLine[];
}

type DraftMeta = Partial<Pick<PurchaseRequestDraft, 'label' | 'supplierHint' | 'contactEmail' | 'note'>>;

interface PurchaseRequestsState {
  drafts: PurchaseRequestDraft[];
  selectedId: string | null;

  createDraft: (meta?: DraftMeta) => PurchaseRequestDraft;
  ensureDraft: (meta?: DraftMeta) => PurchaseRequestDraft;
  selectDraft: (id: string | null) => void;
  deleteDraft: (id: string) => void;

  updateDraft: (id: string, meta: DraftMeta) => void;

  addLine: (id: string, line: Omit<PurchaseRequestLine, 'id'>) => PurchaseRequestDraft | null;
  addLines: (id: string, lines: Omit<PurchaseRequestLine, 'id'>[]) => PurchaseRequestDraft | null;
  setLineQty: (draftId: string, lineId: string, qty: number) => void;
  removeLine: (draftId: string, lineId: string) => void;

  markReceived: (id: string) => void;
}

const nowISO = () => new Date().toISOString();

function normalizeQty(qty: number) {
  if (!Number.isFinite(qty)) return 0;
  return Math.max(0, Math.round(qty));
}

export const usePurchaseRequests = create<PurchaseRequestsState>((set, get) => ({
  drafts: [],
  selectedId: null,

  createDraft: (meta) => {
    const now = nowISO();
    const labelBase = meta?.label?.trim();

    const draft: PurchaseRequestDraft = {
      id: crypto.randomUUID(),
      label:
        labelBase && labelBase.length > 0
          ? labelBase
          : `PR udkast ${get().drafts.filter((d) => d.status === 'draft').length + 1}`,
      supplierHint: meta?.supplierHint ?? null,
      contactEmail: meta?.contactEmail ?? null,
      note: meta?.note ?? null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      lines: [],
    };

    set((state) => ({ drafts: [draft, ...state.drafts], selectedId: draft.id }));
    return draft;
  },

  ensureDraft: (meta) => {
    const state = get();
    if (state.selectedId) {
      const active = state.drafts.find((d) => d.id === state.selectedId);
      if (active) return active;
    }

    const existingDraft = state.drafts.find((d) => d.status === 'draft');
    if (existingDraft) {
      set({ selectedId: existingDraft.id });
      if (meta) {
        const patch: DraftMeta = {};
        if (meta.label && meta.label !== existingDraft.label) patch.label = meta.label;
        if (meta.supplierHint !== undefined && !existingDraft.supplierHint)
          patch.supplierHint = meta.supplierHint;
        if (meta.contactEmail !== undefined && !existingDraft.contactEmail)
          patch.contactEmail = meta.contactEmail;
        if (meta.note !== undefined && meta.note !== existingDraft.note) patch.note = meta.note;
        if (Object.keys(patch).length > 0) get().updateDraft(existingDraft.id, patch);
      }
      return get().drafts.find((d) => d.id === existingDraft.id) ?? existingDraft;
    }

    return get().createDraft(meta);
  },

  selectDraft: (id) => {
    const target = id ? get().drafts.find((d) => d.id === id) : null;
    set({ selectedId: target ? target.id : null });
  },

  deleteDraft: (id) =>
    set((state) => {
      const filtered = state.drafts.filter((d) => d.id !== id);
      const nextSelected = state.selectedId === id ? filtered.find((d) => d.status === 'draft')?.id ?? null : state.selectedId;
      return { drafts: filtered, selectedId: nextSelected ?? null };
    }),

  updateDraft: (id, meta) =>
    set((state) => {
      const idx = state.drafts.findIndex((d) => d.id === id);
      if (idx === -1) return state;

      const draft = state.drafts[idx];
      const next: PurchaseRequestDraft = {
        ...draft,
        ...meta,
        supplierHint: meta.supplierHint !== undefined ? meta.supplierHint : draft.supplierHint,
        contactEmail: meta.contactEmail !== undefined ? meta.contactEmail : draft.contactEmail,
        note: meta.note !== undefined ? meta.note : draft.note,
        label: meta.label !== undefined ? (meta.label?.trim() || draft.label) : draft.label,
        updatedAt: nowISO(),
      };

      const drafts = [...state.drafts];
      drafts[idx] = next;
      return { drafts };
    }),

  addLine: (id, line) => get().addLines(id, [line]),

  addLines: (id, lines) => {
    if (!lines.length) return null;

    let nextDraft: PurchaseRequestDraft | null = null;

    set((state) => {
      const idx = state.drafts.findIndex((d) => d.id === id);
      if (idx === -1) return state;

      const draft = state.drafts[idx];
      const updates: PurchaseRequestLine[] = [...draft.lines];
      const now = nowISO();

      for (const raw of lines) {
        const qty = normalizeQty(raw.qty);
        if (qty <= 0) continue;
        const existingIdx = updates.findIndex((l) => l.itemId === raw.itemId);
        if (existingIdx !== -1) {
          updates[existingIdx] = {
            ...updates[existingIdx],
            qty: updates[existingIdx].qty + qty,
            supplierHint: updates[existingIdx].supplierHint ?? raw.supplierHint ?? null,
          };
        } else {
          updates.push({
            ...raw,
            qty,
            supplierHint: raw.supplierHint ?? null,
            id: crypto.randomUUID(),
          });
        }
      }

      const mergedHint = draft.supplierHint ?? lines.find((l) => l.supplierHint)?.supplierHint ?? null;

      const next: PurchaseRequestDraft = {
        ...draft,
        lines: updates,
        supplierHint: mergedHint,
        updatedAt: now,
      };

      const drafts = [...state.drafts];
      drafts[idx] = next;
      nextDraft = next;
      return { drafts, selectedId: next.id };
    });

    return nextDraft;
  },

  setLineQty: (draftId, lineId, qty) =>
    set((state) => {
      const idx = state.drafts.findIndex((d) => d.id === draftId);
      if (idx === -1) return state;
      const draft = state.drafts[idx];
      const lineIdx = draft.lines.findIndex((l) => l.id === lineId);
      if (lineIdx === -1) return state;

      const normalized = normalizeQty(qty);
      const lines = [...draft.lines];
      if (normalized <= 0) {
        lines.splice(lineIdx, 1);
      } else {
        lines[lineIdx] = { ...lines[lineIdx], qty: normalized };
      }

      const next: PurchaseRequestDraft = {
        ...draft,
        lines,
        updatedAt: nowISO(),
      };

      const drafts = [...state.drafts];
      drafts[idx] = next;
      return { drafts };
    }),

  removeLine: (draftId, lineId) =>
    set((state) => {
      const idx = state.drafts.findIndex((d) => d.id === draftId);
      if (idx === -1) return state;
      const draft = state.drafts[idx];
      const lines = draft.lines.filter((l) => l.id !== lineId);
      const drafts = [...state.drafts];
      drafts[idx] = { ...draft, lines, updatedAt: nowISO() };
      return { drafts };
    }),

  markReceived: (id) => {
    const state = get();
    const draft = state.drafts.find((d) => d.id === id);
    if (!draft) return;
    if (draft.lines.length === 0) return;

    const now = nowISO();

    const deltas = new Map<string, number>();
    for (const line of draft.lines) {
      const qty = normalizeQty(line.qty);
      if (qty <= 0) continue;
      deltas.set(line.itemId, (deltas.get(line.itemId) ?? 0) + qty);
    }

    if (deltas.size === 0) return;

    const inventory = useInventory.getState();
    inventory.setItems((items) =>
      items.map((item) => {
        const delta = deltas.get(item.id);
        if (!delta) return item;
        return {
          ...item,
          qty: item.qty + delta,
          updatedAt: now,
        };
      }),
    );

    const note = `PR ${draft.label}`;
    const entries = Array.from(deltas.entries()).map(([itemId, qty]) => ({
      itemId,
      delta: qty,
      reason: 'Received' as const,
      note,
      atISO: now,
    }));
    useInventoryMovements.getState().appendMany(entries);

    set((state) => {
      const idx = state.drafts.findIndex((d) => d.id === id);
      if (idx === -1) return state;
      const drafts = [...state.drafts];
      drafts[idx] = {
        ...draft,
        status: 'received',
        receivedAt: now,
        updatedAt: now,
      };
      return { drafts };
    });
  },
}));
