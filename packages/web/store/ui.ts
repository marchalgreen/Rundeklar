// src/store/ui.ts
'use client';

import { create } from 'zustand';

type UIState = {
  searchOpen: boolean;
  query: string;
};
type UIActions = {
  openSearch: (q?: string) => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setQuery: (q: string) => void;
};
export type UIStore = UIState & UIActions;

export const useUI = create<UIStore>((set) => ({
  searchOpen: false,
  query: '',
  openSearch: (q) => set({ searchOpen: true, query: q ?? '' }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  setQuery: (q) => set({ query: q }),
}));
