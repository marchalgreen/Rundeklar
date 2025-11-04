// src/store/widgets.ts
'use client';

import { create } from 'zustand';

export type WidgetId =
  | 'todaySchedule'
  | 'currentAppointment'
  | 'deviceStatus'
  | 'orderQueue'
  | 'packageTracking';

export type WidgetTone = 'primary' | 'secondary';

export type WidgetState = {
  id: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  minimized?: boolean;
  tone?: WidgetTone;
};

type WidgetsStore = {
  enabled: boolean;
  snap: number;
  widgets: Record<WidgetId, WidgetState>;
  setPos: (id: WidgetId, pos: Partial<Pick<WidgetState, 'x' | 'y' | 'w' | 'h'>>) => void;
  setTone: (id: WidgetId, tone: WidgetTone) => void;
  toggle: (id: WidgetId, v?: boolean) => void;
  toggleAll: (v?: boolean) => void;
  setMinimized: (id: WidgetId, v?: boolean) => void;
  reset: (id: WidgetId) => void;
};

function computeDefaults(): Record<WidgetId, WidgetState> {
  // Tighter top margin so cards sit closer to the top bar
  const TOPBAR_H = 84; // matches your pt-[84px] top padding
  const TOP_PAD = 28; // small breathing room
  const baseY = TOPBAR_H + TOP_PAD; // = 112px from the viewport top

  // Sensible SSR fallback (large desktop)
  const fallback: Record<WidgetId, WidgetState> = {
    todaySchedule: {
      id: 'todaySchedule',
      x: 420,
      y: baseY,
      w: 360,
      h: 320,
      visible: true,
      tone: 'primary',
    },
    currentAppointment: {
      id: 'currentAppointment',
      x: 820,
      y: baseY,
      w: 380,
      h: 300,
      visible: true,
      tone: 'primary',
    },
    orderQueue: {
      id: 'orderQueue',
      x: 1220,
      y: baseY,
      w: 380,
      h: 240,
      visible: true,
      tone: 'secondary',
    },
    deviceStatus: {
      id: 'deviceStatus',
      x: 1220,
      y: baseY + 260 + 20,
      w: 380,
      h: 220,
      visible: true,
      tone: 'secondary',
    },
    packageTracking: {
      id: 'packageTracking',
      x: 1600,
      y: baseY,
      w: 380,
      h: 260,
      visible: true,
      tone: 'secondary',
    },
  };
  if (typeof window === 'undefined') return fallback;

  // Viewport-aware right alignment
  const vw = window.innerWidth;
  const margin = 72; // outer margin from edges
  const iconColW = 160; // reserved left column for icons
  const gap = 24;

  // Base right column X (keeps nice right margin on any display)
  const rightColW = 380;
  const rightX = Math.max(margin + iconColW, vw - (rightColW + margin));

  return {
    // left/center band
    todaySchedule: {
      id: 'todaySchedule',
      x: rightX - 420,
      y: baseY,
      w: 360,
      h: 320,
      visible: true,
      tone: 'primary',
    },
    currentAppointment: {
      id: 'currentAppointment',
      x: rightX - 420,
      y: baseY + 340 + gap,
      w: 380,
      h: 300,
      visible: true,
      tone: 'primary',
    },

    // right column stack
    orderQueue: {
      id: 'orderQueue',
      x: rightX,
      y: baseY,
      w: 380,
      h: 240,
      visible: true,
      tone: 'secondary',
    },
    deviceStatus: {
      id: 'deviceStatus',
      x: rightX,
      y: baseY + 240 + gap,
      w: 380,
      h: 220,
      visible: true,
      tone: 'secondary',
    },
    packageTracking: {
      id: 'packageTracking',
      x: rightX,
      y: baseY + 240 + gap + 220 + gap,
      w: 380,
      h: 260,
      visible: true,
      tone: 'secondary',
    },
  };
}

function load(): Record<WidgetId, WidgetState> {
  try {
    const raw = localStorage.getItem('clairity:widgets');
    if (!raw) return computeDefaults();
    const parsed = JSON.parse(raw);
    // Merge so new defaults (like closer-to-top) apply for screens that never saved
    return { ...computeDefaults(), ...parsed };
  } catch {
    return computeDefaults();
  }
}

function save(next: Record<WidgetId, WidgetState>) {
  try {
    localStorage.setItem('clairity:widgets', JSON.stringify(next));
  } catch {}
}

export const useWidgets = create<WidgetsStore>((set, _get) => ({
  enabled: true,
  snap: 12,
  widgets: load(),
  setPos: (id, pos) => {
    set((s) => {
      const next = { ...s.widgets, [id]: { ...s.widgets[id], ...pos } };
      save(next);
      return { widgets: next };
    });
  },
  setTone: (id, tone) =>
    set((s) => {
      const next = { ...s.widgets, [id]: { ...s.widgets[id], tone } };
      save(next);
      return { widgets: next };
    }),
  toggle: (id, v) =>
    set((s) => {
      const next = {
        ...s.widgets,
        [id]: { ...s.widgets[id], visible: v ?? !s.widgets[id].visible },
      };
      save(next);
      return { widgets: next };
    }),
  toggleAll: (v) => set((s) => ({ enabled: v ?? !s.enabled })),
  setMinimized: (id, v) =>
    set((s) => {
      const next = {
        ...s.widgets,
        [id]: { ...s.widgets[id], minimized: v ?? !s.widgets[id].minimized },
      };
      save(next);
      return { widgets: next };
    }),
  reset: (id) =>
    set((s) => {
      const defaults = computeDefaults();
      const next = { ...s.widgets, [id]: defaults[id] };
      save(next);
      return { widgets: next };
    }),
}));
