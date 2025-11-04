'use client';

import { create } from 'zustand';

export type IconId = 'kundekort' | 'logbog' | 'varer' | 'genveje';

export type IconState = {
  id: IconId;
  x: number;
  y: number;
  visible: boolean;
};

type IconStore = {
  snap: number; // drag snap (px)
  icons: Record<IconId, IconState>;
  setPos: (id: IconId, pos: Partial<Pick<IconState, 'x' | 'y'>>) => void;
  reset: () => void;
};

const LEFT_X = 48; // standard left column
const START_Y = 220; // start below topbar
const STEP_Y = 160; // vertical gap

const DEFAULTS: Record<IconId, IconState> = {
  kundekort: { id: 'kundekort', x: LEFT_X, y: START_Y + STEP_Y * 0, visible: true },
  logbog: { id: 'logbog', x: LEFT_X, y: START_Y + STEP_Y * 1, visible: true },
  varer: { id: 'varer', x: LEFT_X, y: START_Y + STEP_Y * 2, visible: true },
  genveje: { id: 'genveje', x: LEFT_X, y: START_Y + STEP_Y * 3, visible: true },
};

function load(): Record<IconId, IconState> {
  try {
    const raw = localStorage.getItem('clairity:icons');
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function save(next: Record<IconId, IconState>) {
  try {
    localStorage.setItem('clairity:icons', JSON.stringify(next));
  } catch {}
}

export const useIcons = create<IconStore>((set, _get) => ({
  snap: 12,
  icons: load(),
  setPos: (id, pos) => {
    set((s) => {
      const next = { ...s.icons, [id]: { ...s.icons[id], ...pos } };
      save(next);
      return { icons: next };
    });
  },
  reset: () =>
    set(() => {
      save(DEFAULTS);
      return { icons: DEFAULTS };
    }),
}));
