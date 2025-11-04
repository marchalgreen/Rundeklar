'use client';
import { create } from 'zustand';

export type NotifItem = {
  id: string;
  kind: 'order' | 'calendar' | 'message' | 'report' | 'feature' | 'system';
  title: string;
  body?: string;
  when: string;
  read?: boolean;
  href?: string;
  meta?: Record<string, unknown>;
};

type State = {
  items: NotifItem[];
  unread: number;
  /** Replace the whole list (recounts unread) */
  set: (items: NotifItem[]) => void;
  /** Toggle read by id */
  toggleRead: (id: string) => void;
  /** Mark all read */
  markAllRead: () => void;
  /** Seed only if empty (useful for mocks) */
  seedIfEmpty: (items: NotifItem[]) => void;
};

export const useNotifications = create<State>((set, get) => ({
  items: [],
  unread: 0,
  set: (items) =>
    set({
      items,
      unread: items.reduce((n, it) => n + (it.read ? 0 : 1), 0),
    }),
  toggleRead: (id) =>
    set((s) => {
      const items = s.items.map((x) => (x.id === id ? { ...x, read: !x.read } : x));
      return { items, unread: items.reduce((n, it) => n + (it.read ? 0 : 1), 0) };
    }),
  markAllRead: () =>
    set((s) => {
      const items = s.items.map((x) => ({ ...x, read: true }));
      return { items, unread: 0 };
    }),
  seedIfEmpty: (items) => {
    if (get().items.length === 0) get().set(items);
  },
}));
