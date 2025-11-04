'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeWorkArea } from '@/lib/workArea';
import { WINDOW_DEFAULTS } from '@/lib/windowDefaults';
import { hueFromString } from '@/lib/utils/customerAccent';

/* -----------------------------------------------------------------------------
   Types
----------------------------------------------------------------------------- */

export type WinType =
  | 'customerForm'
  | 'customer'
  | 'kundekort_search'
  | 'logbook'
  | 'inventory'
  | 'inventoryDashboard'
  | 'purchaseRequest'
  | 'hotkeys_help'
  | 'synsJournal'
  | 'booking_calendar'
  | string;

export type WinState = {
  id: string;
  type: WinType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  payload?: WindowPayload;

  groupId?: string;
  groupTitle?: string;
  accentHue?: number;

  lastRect?: { x: number; y: number; w: number; h: number };
};

type WindowPayload = {
  customer?: {
    id?: string;
    customerNo?: string | number;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  [key: string]: unknown;
};

type OpenOpts = {
  type: WinType;
  title?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  payload?: WindowPayload;
};

type Store = {
  windows: Record<string, WinState>;
  order: string[];
  zNext: number;
  cascadeIndex: number;

  // ID of focused window
  getFocusedId: () => string | null;
  cycleFocus: (dir?: 1 | -1) => void;
  toggleMinimize: (id: string) => void;

  focus: (id: string) => void;
  open: (opts: OpenOpts) => string;
  close: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveResize: (id: string, patch: Partial<Pick<WinState, 'x' | 'y' | 'w' | 'h'>>) => void;

  // NEW: Show Desktop toggle
  hiddenDesktopSnapshot: string[]; // windows we temporarily minimized
  toggleShowDesktop: () => void;
};

type PersistedDesktopState = Pick<
  Store,
  'windows' | 'order' | 'zNext' | 'cascadeIndex' | 'hiddenDesktopSnapshot'
>;

// Base desktop state used for initial load and for migrations of persisted data.
const DESKTOP_DEFAULT: PersistedDesktopState = {
  windows: {},
  order: [],
  zNext: 1,
  cascadeIndex: 0,
  hiddenDesktopSnapshot: [],
};

/* -----------------------------------------------------------------------------
   Helpers / Defaults
----------------------------------------------------------------------------- */

function genId() {
  return Math.random().toString(36).slice(2, 7);
}

const SINGLETON_TYPES: WinType[] = ['booking_calendar'];
const DEDUPE_PER_GROUP: WinType[] = ['customerForm'];
const CASCADE_STEP_X = 28;
const CASCADE_STEP_Y = 24;
const CASCADE_MAX_STEPS = 8;

function getDef(type: WinType) {
  return WINDOW_DEFAULTS[type] as
    | { w: number; h: number; minW?: number; minH?: number; topOffset?: number }
    | undefined;
}

function clampToWorkArea(
  type: WinType,
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const desk = computeWorkArea();
  const def = getDef(type);
  const minW = def?.minW ?? 160;
  const minH = def?.minH ?? 120;

  const cw = Math.max(minW, Math.min(w, desk.w));
  const ch = Math.max(minH, Math.min(h, desk.h));

  const minX = desk.x,
    minY = desk.y;
  const maxX = Math.max(minX, desk.x + desk.w - cw);
  const maxY = Math.max(minY, desk.y + desk.h - ch);

  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
    w: cw,
    h: ch,
  };
}

function centerRectInDesk(
  type: WinType,
  w: number,
  h: number,
  topFallback = 18,
): { x: number; y: number; w: number; h: number } {
  const desk = computeWorkArea();
  const cw = Math.min(w, desk.w);
  const ch = Math.min(h, desk.h);
  const x = desk.x + Math.round((desk.w - cw) / 2);
  const topOffset = getDef(type)?.topOffset ?? topFallback;
  const y = desk.y + topOffset;
  return clampToWorkArea(type, x, y, cw, ch);
}

function deriveGrouping(type: WinType, payload?: WindowPayload) {
  const c = payload?.customer;
  if (!c) return { groupId: undefined, groupTitle: undefined, accentHue: undefined };
  const id = c.id ?? c.customerNo ?? c.email ?? `${c.firstName ?? ''}${c.lastName ?? ''}`;
  const groupId = `${type === 'customerForm' || type === 'synsJournal' ? 'customer' : type}:${id}`;
  const groupTitle = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || `#${c.customerNo ?? id}`;
  const accentHue = hueFromString(`${id}`);
  return { groupId, groupTitle, accentHue };
}

/* -----------------------------------------------------------------------------
   Store
----------------------------------------------------------------------------- */

export const useDesktop = create<Store>()(
  persist(
    (set, get) => ({
      ...DESKTOP_DEFAULT,

      getFocusedId: () => {
        const s = get();
        for (let i = s.order.length - 1; i >= 0; i--) {
          const id = s.order[i];
          const w = s.windows[id];
          if (w && !w.minimized) return id;
        }
        return null;
      },

      cycleFocus: (dir = 1) =>
        set((s) => {
          const active = s.order.filter((id) => !s.windows[id]?.minimized);
          if (active.length <= 1) return {};
          const arr = [...s.order];
          const target = dir === 1 ? active[active.length - 2] : active[0];
          const idx = arr.lastIndexOf(target);
          arr.splice(idx, 1);
          arr.push(target);
          return { order: arr };
        }),

      toggleMinimize: (id) =>
        set((s) => {
          const cur = s.windows[id];
          if (!cur) return {};
          const minimized = !cur.minimized;
          return {
            windows: { ...s.windows, [id]: { ...cur, minimized } },
            order: minimized ? s.order : [...s.order.filter((x) => x !== id), id],
          };
        }),

      focus: (id) =>
        set((s) => {
          const nextZ = s.zNext + 1;
          return {
            order: [...s.order.filter((x) => x !== id), id],
            windows: { ...s.windows, [id]: { ...s.windows[id], z: nextZ } },
            zNext: nextZ,
          };
        }),

      open: (opts) => {
        const s0 = get();

        if (SINGLETON_TYPES.includes(opts.type)) {
          const existing = Object.values(s0.windows).find((w) => w.type === opts.type);
          if (existing) {
            set((s) => ({
              windows: { ...s.windows, [existing.id]: { ...existing, minimized: false } },
              order: [...s.order.filter((x) => x !== existing.id), existing.id],
            }));
            return existing.id;
          }
        }

        const { groupId, groupTitle, accentHue } = deriveGrouping(opts.type, opts.payload);

        if (groupId && DEDUPE_PER_GROUP.includes(opts.type)) {
          const dupe = Object.values(s0.windows).find(
            (w) => w.type === opts.type && w.groupId === groupId,
          );
          if (dupe) {
            set((s) => ({
              windows: { ...s.windows, [dupe.id]: { ...dupe, minimized: false } },
              order: [...s.order.filter((x) => x !== dupe.id), dupe.id],
            }));
            return dupe.id;
          }
        }

        const desk = computeWorkArea();
        const baseW = Math.min(720, desk.w);
        const baseH = Math.min(480, desk.h);

        const def = getDef(opts.type);
        const prefW = def?.w ?? baseW;
        const prefH = def?.h ?? baseH;
        const W = Math.min(prefW, desk.w);
        const H = Math.min(prefH, desk.h);

        let cx = desk.x + 80;
        let cy = desk.y + (def?.topOffset ?? 64);

        const step = s0.cascadeIndex % CASCADE_MAX_STEPS;
        cx += step * CASCADE_STEP_X;
        cy += step * CASCADE_STEP_Y;

        const cl = clampToWorkArea(opts.type, opts.x ?? cx, opts.y ?? cy, opts.w ?? W, opts.h ?? H);

        const id = genId();
        const win: WinState = {
          id,
          type: opts.type,
          title: opts.title ?? String(opts.type),
          ...cl,
          z: s0.zNext + 1,
          minimized: false,
          maximized: false,
          payload: opts.payload,

          groupId,
          groupTitle,
          accentHue,
        };

        set((s2) => ({
          windows: { ...s2.windows, [id]: win },
          order: [...s2.order, id],
          zNext: win.z,
          cascadeIndex: (s2.cascadeIndex + 1) % CASCADE_MAX_STEPS,
        }));
        return id;
      },

      close: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.windows;
          return { windows: rest, order: s.order.filter((x) => x !== id) };
        }),

      minimize: (id) =>
        set((s) => ({
          windows: { ...s.windows, [id]: { ...s.windows[id], minimized: true } },
        })),

      restore: (id) =>
        set((s) => ({
          windows: { ...s.windows, [id]: { ...s.windows[id], minimized: false } },
          order: [...s.order.filter((x) => x !== id), id],
        })),

      toggleMaximize: (id) =>
        set((s) => {
          const cur = s.windows[id];
          if (!cur) return {};
          const desk = computeWorkArea();

          if (!cur.maximized) {
            return {
              windows: {
                ...s.windows,
                [id]: {
                  ...cur,
                  maximized: true,
                  lastRect: { x: cur.x, y: cur.y, w: cur.w, h: cur.h },
                  x: desk.x,
                  y: desk.y,
                  w: desk.w,
                  h: desk.h,
                },
              },
              order: [...s.order.filter((x) => x !== id), id],
            };
          } else {
            const hasLast = !!cur.lastRect;
            const baseRect = hasLast
              ? cur.lastRect!
              : {
                  x: desk.x,
                  y: desk.y,
                  w: Math.max(480, Math.round(desk.w * 0.7)),
                  h: Math.max(360, Math.round(desk.h * 0.7)),
                };

            const looksTopLeft =
              Math.abs(baseRect.x - desk.x) <= 8 && Math.abs(baseRect.y - desk.y) <= 8;

            const desired =
              looksTopLeft || !hasLast
                ? centerRectInDesk(cur.type, baseRect.w, baseRect.h, 18)
                : clampToWorkArea(cur.type, baseRect.x, baseRect.y, baseRect.w, baseRect.h);

            const next: WinState = {
              ...cur,
              maximized: false,
              lastRect: undefined,
              ...desired,
            };

            return {
              windows: { ...s.windows, [id]: next },
              order: [...s.order.filter((x) => x !== id), id],
            };
          }
        }),

      moveResize: (id, patch) =>
        set((s) => {
          const cur = s.windows[id];
          if (!cur) return {};
          const next = clampToWorkArea(
            cur.type,
            patch.x ?? cur.x,
            patch.y ?? cur.y,
            patch.w ?? cur.w,
            patch.h ?? cur.h,
          );
          return {
            windows: {
              ...s.windows,
              [id]: { ...cur, ...next, maximized: false },
            },
          };
        }),

      /* -------- NEW: Show Desktop toggle -------- */
      toggleShowDesktop: () =>
        set((s) => {
          const visible = s.order.filter((id) => !s.windows[id]?.minimized);
          if (visible.length > 0) {
            // Minimize everything currently visible, remember them
            const nextWins: Record<string, WinState> = { ...s.windows };
            for (const id of visible) {
              nextWins[id] = { ...nextWins[id], minimized: true };
            }
            return { windows: nextWins, hiddenDesktopSnapshot: visible };
          }
          // Nothing visible: restore previously hidden
          if (s.hiddenDesktopSnapshot.length > 0) {
            const nextWins: Record<string, WinState> = { ...s.windows };
            for (const id of s.hiddenDesktopSnapshot) {
              if (nextWins[id]) nextWins[id] = { ...nextWins[id], minimized: false };
            }
            // Bring them to front in the same order they were captured
            const restored = s.hiddenDesktopSnapshot.filter((id) => !!nextWins[id]);
            const nextOrder = [...s.order.filter((id) => !restored.includes(id)), ...restored];
            return { windows: nextWins, order: nextOrder, hiddenDesktopSnapshot: [] };
          }
          return {};
        }),
    }),
    {
      name: 'clairity-desktop',
      version: 2,
      migrate: (persisted: unknown, _fromVersion: number) => {
        const prev =
          persisted && typeof persisted === 'object'
            ? (persisted as Partial<PersistedDesktopState>)
            : {};
        return { ...DESKTOP_DEFAULT, ...prev };
      },
      // Do not persist transient flags like `openScan` inside window payloads
      partialize: (state) => {
        const windows = Object.fromEntries(
          Object.entries(state.windows).map(([id, w]) => {
            const payload = w?.payload ? { ...w.payload } : undefined;
            if (payload && 'openScan' in payload) delete (payload as any).openScan;
            return [id, { ...w, payload }];
          }),
        );
        return { ...state, windows };
      },
      // Extra safety: if older sessions had `openScan` persisted, strip it on load
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const wins = state.windows;
        for (const id in wins) {
          const w = wins[id];
          if (w && w.payload && 'openScan' in (w.payload as any)) {
            delete (w.payload as any).openScan;
          }
        }
      },
    },
  ),
);
