// src/store/calendar.ts
'use client';

import { create } from 'zustand';
import { openEventEditor, closeEventEditor } from '@/components/calendar/eventEditor';
import {
  addDays,
  clampMinutes,
  compareByStart,
  localDayKey,
  sameLocalDay,
  totalMinutes,
} from '@/lib/calendar/time';
import {
  CALENDAR_DAY_END,
  CALENDAR_DAY_START,
  CALENDAR_MIN_SLOT_MIN,
} from '@/lib/calendar/config';

export type View = 'day' | 'week' | 'month';
export type EventStatus =
  | 'booked'
  | 'tentative'
  | 'checked_in'
  | 'completed'
  | 'no_show'
  | 'cancelled';
export type ServiceType =
  | 'eyeexam'
  | 'lenses'
  | 'check'
  | 'glasses'
  | 'repair'
  | 'pickup'
  | 'other';

export type Id = string & { __brand?: 'Id' };
export type StaffId = Id;
export type CustomerId = Id;
export type EventId = Id;
export type ResourceId = Id;

export type Event = {
  id: EventId;
  title: string;
  customerId: CustomerId;
  staffId: StaffId;
  resourceId?: ResourceId;
  start: string;
  end: string;
  status: EventStatus;
  serviceType: ServiceType;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Staff = {
  id: StaffId;
  name: string;
  role: 'optometrist' | 'assistant' | 'admin';
  color?: string;
  businessHours: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', [string, string][]>;
};

export type CalEvent = Event;

type Filters = {
  staffIds: string[];
  resourceIds: string[];
  status: EventStatus[];
  services: ServiceType[];
};

type Dragging =
  | { kind: 'range'; staffId: StaffId; startISO: string; endISO: string }
  | {
      kind: 'event';
      eventId: EventId;
      mode: 'move' | 'resize-start' | 'resize-end';
      anchorPointerISO: string;
      originalStartISO: string;
      originalEndISO: string;
      originalStaffId: StaffId;
    };

type EventDragMode = Extract<Dragging, { kind: 'event' }>['mode'];

type PendingMove = {
  eventId: EventId;
  fromStaffId: StaffId;
  toStaffId: StaffId;
  newStartISO: string;
  newEndISO: string;
  originalStartISO: string;
  originalEndISO: string;
};

type StaffMap = Record<StaffId, Staff>;
type EventMap = Record<EventId, Event>;
type Selection = { eventId?: EventId; range?: [string, string] };
type DraftEvent = {
  start: string;
  end: string;
  staffId: StaffId;
  serviceType?: ServiceType;
  title?: string;
};
type CalEventCreate = Omit<Event, 'id'>;

export type FocusedSlot = {
  view: 'day' | 'week';
  dateISO: string;
  staffId?: StaffId;
  minute?: number;
};

type WeekFocusBounds = { startISO: string; endISO: string } | undefined;

export interface CalendarState {
  view: View;
  dateISO: string;
  filters: Filters;
  events: EventMap;
  staff: StaffMap;
  loading: boolean;

  selection?: Selection;

  /** Inline create-draft */
  draft?: DraftEvent;

  /** Drag state */
  dragging?: Dragging;
  dragOverStaffId?: StaffId;
  setDragOverStaff: (staffId?: StaffId) => void;

  /** Move-confirm state (cross-staff in day view) */
  pendingMove?: PendingMove;
  confirmPendingMove(accept: boolean): Promise<void>;

  /** Editor modal state */
  editor: { open: boolean; eventId?: EventId };
  openEditor: (eventId: EventId) => void;
  closeEditor: () => void;

  /** Utils */
  snapISO(iso: string, minutes?: 5 | 15): string;
  overlapExists(staffId: StaffId, startISO: string, endISO: string, ignoreId?: EventId): boolean;

  /** Actions */
  init(): Promise<void>;
  setView(v: View): void;
  setDate(iso: string): void;
  setFilters(p: Partial<Filters>): void;
  setSelection(sel?: Selection): void;

  beginRange(staffId: StaffId, startISO: string): void;
  updateRange(toISO: string): void;
  commitRange(): Promise<Event | undefined>;
  cancelRange(): void;

  beginEventDrag(eventId: EventId, mode: EventDragMode, anchorPointerISO: string): void;
  updateEventDrag(toISO: string): void;
  commitEventDrag(): Promise<void>;
  cancelEventDrag(): void;

  create(e: CalEventCreate): Promise<Event>;
  update(id: EventId, patch: Partial<Event>): Promise<Event>;
  remove(id: EventId): Promise<void>;
  cycleStatus(id: EventId): void;

  /** Keyboard focus + navigation */
  focusedSlot?: FocusedSlot;
  focusAnchor?: HTMLElement | null;
  weekFocusBounds?: WeekFocusBounds;
  focusSlot(focused: FocusedSlot): void;
  focusClear(): void;
  setFocusAnchor(el: HTMLElement | null): void;
  setWeekFocusBounds(bounds: { startISO: string; endISO: string } | undefined): void;
  moveUp(): void;
  moveDown(): void;
  moveLeft(): void;
  moveRight(): void;
  home(): void;
  end(): void;
  pagePrev(): void;
  pageNext(): void;
}

/* helpers */
function toRecord<T extends { id: string }>(arr: T[]): Record<string, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x]));
}
function isoAt(date: Date, h: number, m: number) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/* demo */
const today = new Date();
const todayAt = (h: number, m = 0) => isoAt(today, h, m);

const demoStaff: StaffMap = toRecord<Staff>([
  {
    id: 's1' as StaffId,
    name: 'Anna Larsen',
    role: 'assistant',
    color: '160 65% 45%',
    businessHours: {
      mon: [['08:00', '16:00']],
      tue: [['08:00', '16:00']],
      wed: [['08:00', '16:00']],
      thu: [['08:00', '16:00']],
      fri: [['08:00', '16:00']],
      sat: [],
      sun: [],
    },
  },
  {
    id: 's2' as StaffId,
    name: 'Demo Staff',
    role: 'optometrist',
    color: '210 90% 50%',
    businessHours: {
      mon: [['08:00', '16:00']],
      tue: [['08:00', '16:00']],
      wed: [['08:00', '16:00']],
      thu: [['08:00', '16:00']],
      fri: [['08:00', '16:00']],
      sat: [],
      sun: [],
    },
  },
  {
    id: 's3' as StaffId,
    name: 'Jonas Madsen',
    role: 'admin',
    color: '25 85% 55%',
    businessHours: {
      mon: [['08:00', '16:00']],
      tue: [['08:00', '16:00']],
      wed: [['08:00', '16:00']],
      thu: [['08:00', '16:00']],
      fri: [['08:00', '16:00']],
      sat: [],
      sun: [],
    },
  },
]);

const demoEvents: EventMap = {
  e3: {
    id: 'e3' as EventId,
    title: 'Admin Work',
    customerId: 'c_demo3' as CustomerId,
    staffId: 's3' as StaffId,
    start: todayAt(11, 0),
    end: todayAt(12, 0),
    status: 'booked',
    serviceType: 'other',
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  },
};

export const useCalendar = create<CalendarState>()((set, get) => ({
  view: 'day',
  dateISO: new Date().toISOString(),
  filters: {
    staffIds: [],
    resourceIds: [],
    status: ['booked', 'tentative', 'checked_in', 'completed', 'no_show', 'cancelled'],
    services: ['eyeexam', 'lenses', 'check', 'glasses', 'repair', 'pickup', 'other'],
  },

  events: demoEvents,
  staff: demoStaff,
  loading: false,

  selection: undefined,
  focusedSlot: undefined,
  focusAnchor: null,
  weekFocusBounds: undefined,

  dragOverStaffId: undefined,
  setDragOverStaff(staffId) {
    const staffMap = get().staff;
    const known = staffId ? Boolean(staffMap[staffId]) : false;
    const next = known ? staffId : undefined;
    if (get().dragOverStaffId !== next) set({ dragOverStaffId: next });
  },

  pendingMove: undefined,
  async confirmPendingMove(accept) {
    const s = get();
    const p = s.pendingMove;
    if (!p) return;
    if (accept) {
      try {
        await s.update(p.eventId, { staffId: p.toStaffId, start: p.newStartISO, end: p.newEndISO });
      } finally {
        set({ pendingMove: undefined, selection: { eventId: p.eventId } });
      }
    } else {
      set((st) => ({
        events: {
          ...st.events,
          [p.eventId]: {
            ...st.events[p.eventId],
            staffId: p.fromStaffId,
            start: p.originalStartISO,
            end: p.originalEndISO,
          },
        },
        pendingMove: undefined,
        selection: { eventId: p.eventId },
      }));
    }
  },

  /** editor modal state */
  editor: { open: false, eventId: undefined },
  openEditor(eventId) {
    set({ editor: { open: true, eventId }, selection: { eventId } });
    openEventEditor(eventId);
  },
  closeEditor() {
    set({ editor: { open: false, eventId: undefined } });
    closeEventEditor();
  },

  snapISO(iso, minutes = 15) {
    const d = new Date(iso);
    const ms = d.getMinutes();
    const snapped = Math.round(ms / minutes) * minutes;
    d.setMinutes(snapped, 0, 0);
    return d.toISOString();
  },

  overlapExists(staffId, startISO, endISO, ignoreId) {
    const s = get();
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    return Object.values(s.events).some((ev) => {
      if (ignoreId && ev.id === ignoreId) return false;
      if (ev.staffId !== staffId) return false;
      const a = new Date(ev.start).getTime();
      const b = new Date(ev.end).getTime();
      return Math.max(a, start) < Math.min(b, end);
    });
  },

  async init() {
    set({ loading: false });
  },

  setView(v) {
    set({ view: v });
  },
  setDate(iso) {
    set({ dateISO: iso });
  },
  setFilters(p) {
    set((s) => ({ filters: { ...s.filters, ...p } }));
  },
  setSelection(sel) {
    set({ selection: sel });
  },

  // Range create
  beginRange(staffId, startISO) {
    const start = get().snapISO(startISO);
    set({
      draft: { start, end: start, staffId },
      dragging: { kind: 'range', staffId, startISO: start, endISO: start },
    });
  },
  updateRange(toISO) {
    const s = get();
    const d = s.dragging;
    if (!d || d.kind !== 'range') return;
    const pointer = s.snapISO(toISO);
    const start = new Date(d.startISO) < new Date(pointer) ? d.startISO : pointer;
    const end = new Date(d.startISO) < new Date(pointer) ? pointer : d.startISO;
    const prevDraft = s.draft;
    const nextDraft = prevDraft ? { ...prevDraft, start, end } : prevDraft;
    set({ draft: nextDraft, dragging: { ...d, endISO: end } });
  },
  async commitRange() {
    const s = get();
    const d = s.dragging;
    if (!d || d.kind !== 'range') return;
    const draft = s.draft;
    if (!draft) {
      set({ dragging: undefined });
      return;
    }

    const { start, staffId } = draft;
    let end = draft.end;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minMs = 15 * 60 * 1000;
    if (ms < minMs) end = new Date(new Date(start).getTime() + minMs).toISOString();
    if (s.overlapExists(staffId, start, end)) {
      set({ draft: undefined, dragging: undefined });
      return;
    }

    const created = await s.create({
      title: 'Ny aftale',
      customerId: ('c_' + Math.random().toString(36).slice(2, 7)) as CustomerId,
      staffId,
      start,
      end,
      status: 'booked',
      serviceType: 'eyeexam',
      createdBy: 'system',
      updatedBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    set({ selection: { eventId: created.id }, draft: undefined, dragging: undefined });
    return created;
  },
  cancelRange() {
    set({ draft: undefined, dragging: undefined });
  },

  // Event drag
  beginEventDrag(eventId, mode, anchorPointerISO) {
    const ev = get().events[eventId];
    if (!ev) return;
    set({
      dragging: {
        kind: 'event',
        eventId,
        mode,
        anchorPointerISO: get().snapISO(anchorPointerISO),
        originalStartISO: ev.start,
        originalEndISO: ev.end,
        originalStaffId: ev.staffId,
      },
      dragOverStaffId: ev.staffId,
    });
  },
  updateEventDrag(toISO) {
    const s = get();
    const d = s.dragging as Extract<Dragging, { kind: 'event' }>;
    if (!d || d.kind !== 'event') return;
    const pointer = s.snapISO(toISO);
    const ev = s.events[d.eventId];
    if (!ev) return;

    if (d.mode === 'move') {
      const delta = new Date(pointer).getTime() - new Date(d.anchorPointerISO).getTime();
      const ns = new Date(d.originalStartISO).getTime() + delta;
      const ne = new Date(d.originalEndISO).getTime() + delta;
      set({
        events: {
          ...s.events,
          [ev.id]: { ...ev, start: new Date(ns).toISOString(), end: new Date(ne).toISOString() },
        },
      });
    } else if (d.mode === 'resize-start') {
      const min = 15 * 60 * 1000;
      const e = new Date(d.originalEndISO).getTime();
      const ns = Math.min(new Date(pointer).getTime(), e - min);
      set({ events: { ...s.events, [ev.id]: { ...ev, start: new Date(ns).toISOString() } } });
    } else if (d.mode === 'resize-end') {
      const min = 15 * 60 * 1000;
      const s0 = new Date(d.originalStartISO).getTime();
      const ne = Math.max(new Date(pointer).getTime(), s0 + min);
      set({ events: { ...s.events, [ev.id]: { ...ev, end: new Date(ne).toISOString() } } });
    }
  },

  // View-aware commit; select event after drop; optimistic clear
  async commitEventDrag() {
    const s = get();
    const d = s.dragging as Extract<Dragging, { kind: 'event' }>;
    if (!d || d.kind !== 'event') return;

    const ev = s.events[d.eventId];
    if (!ev) {
      set({ dragging: undefined, dragOverStaffId: undefined });
      return;
    }

    const view = get().view;
    const toStaffId = s.dragOverStaffId ?? ev.staffId;
    const isCrossStaff = toStaffId !== d.originalStaffId;

    if (view === 'day' && isCrossStaff) {
      set({
        pendingMove: {
          eventId: ev.id,
          fromStaffId: d.originalStaffId,
          toStaffId,
          newStartISO: ev.start,
          newEndISO: ev.end,
          originalStartISO: d.originalStartISO,
          originalEndISO: d.originalEndISO,
        },
        dragging: undefined,
        dragOverStaffId: undefined,
        selection: { eventId: ev.id },
      });
      return;
    }

    set({ dragging: undefined, dragOverStaffId: undefined, selection: { eventId: ev.id } });

    try {
      await s.update(ev.id, { start: ev.start, end: ev.end });
    } catch {
      /* keep optimistic */
    }
  },

  cancelEventDrag() {
    set({ dragging: undefined, dragOverStaffId: undefined });
  },

  async create(e) {
    const tempId = ('evt_' + Math.random().toString(36).slice(2, 8)) as EventId;
    const optimistic: Event = { id: tempId, ...e };
    set((s) => ({ events: { ...s.events, [tempId]: optimistic } }));
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e),
      });
      if (!res.ok) return optimistic;
      const created: Event = await res.json();
      set((s) => {
        const { [tempId]: _, ...rest } = s.events;
        return { events: { ...rest, [created.id]: created } };
      });
      return created;
    } catch {
      return optimistic;
    }
  },

  // Hardened server reconciliation
  async update(id, patch) {
    const prev = get().events[id];
    const staffMap = get().staff;

    const patchStaffId = patch.staffId;
    const optimisticStaffId =
      patchStaffId && staffMap[patchStaffId] ? patchStaffId : prev?.staffId;

    set((s) => ({
      events: {
        ...s.events,
        [id]: {
          ...s.events[id],
          ...patch,
          staffId: optimisticStaffId ?? s.events[id].staffId,
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    try {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(String(res.status));
      const server: Event = await res.json();

      const prevStaffId = prev?.staffId;
      const desiredStaffId =
        patchStaffId && staffMap[patchStaffId] ? patchStaffId : prevStaffId ?? server.staffId;
      const normalizedStaffId = staffMap[desiredStaffId]
        ? desiredStaffId
        : prevStaffId ?? server.staffId;

      const finalTitle = patch.title !== undefined ? server.title : prev?.title ?? server.title;
      const finalServiceType =
        patch.serviceType !== undefined
          ? server.serviceType
          : prev?.serviceType ?? server.serviceType;
      const finalNotes = patch.notes !== undefined ? server.notes : prev?.notes ?? server.notes;

      const finalStart = patch.start !== undefined ? server.start : prev?.start ?? server.start;
      const finalEnd = patch.end !== undefined ? server.end : prev?.end ?? server.end;

      set((s) => ({
        events: {
          ...s.events,
          [id]: {
            ...s.events[id],
            ...server,
            staffId: normalizedStaffId,
            title: finalTitle,
            serviceType: finalServiceType,
            notes: finalNotes,
            start: finalStart,
            end: finalEnd,
          },
        },
      }));

      return get().events[id];
    } catch (e) {
      set((s) => {
        const next = { ...s.events };
        if (prev) next[id] = prev;
        else delete next[id];
        return { events: next };
      });
      throw e;
    }
  },

  async remove(id) {
    const prev = get().events[id];
    set((s) => {
      const { [id]: _, ...rest } = s.events;
      return { events: rest };
    });
    try {
      const res = await fetch(`/api/calendar/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      set((s) => {
        const next = { ...s.events };
        if (prev) next[id] = prev;
        return { events: next };
      });
    }
  },

  cycleStatus(id) {
    const order: EventStatus[] = [
      'booked',
      'checked_in',
      'completed',
      'tentative',
      'no_show',
      'cancelled',
    ];
    const ev = get().events[id];
    if (!ev) return;
    const next = order[(order.indexOf(ev.status) + 1) % order.length];
    get().update(id, { status: next });
  },

  focusSlot(focused) {
    set({ focusedSlot: normalizeFocus(focused) });
  },
  focusClear() {
    set({ focusedSlot: undefined });
  },
  setFocusAnchor(el) {
    set({ focusAnchor: el });
  },
  setWeekFocusBounds(bounds) {
    set({ weekFocusBounds: bounds });
  },
  moveUp() {
    set((state) => shiftMinutes(state, -CALENDAR_MIN_SLOT_MIN) ?? {});
  },
  moveDown() {
    set((state) => shiftMinutes(state, CALENDAR_MIN_SLOT_MIN) ?? {});
  },
  moveLeft() {
    set((state) => shiftHorizontal(state, -1) ?? {});
  },
  moveRight() {
    set((state) => shiftHorizontal(state, 1) ?? {});
  },
  home() {
    set((state) => setMinute(state, 0) ?? {});
  },
  end() {
    set((state) => setMinute(state, TOTAL_DAY_MINUTES) ?? {});
  },
  pagePrev() {
    set((state) => pageShift(state, -1) ?? {});
  },
  pageNext() {
    set((state) => pageShift(state, 1) ?? {});
  },
}));

const TOTAL_DAY_MINUTES = totalMinutes(CALENDAR_DAY_START, CALENDAR_DAY_END);

function clampMinuteValue(minute?: number) {
  return clampMinutes(minute ?? 0, TOTAL_DAY_MINUTES);
}

function normalizeFocus(focused: FocusedSlot): FocusedSlot {
  return {
    ...focused,
    minute: clampMinuteValue(focused.minute),
  };
}

function ensureFocusForActiveView(state: CalendarState): FocusedSlot | undefined {
  const slot = state.focusedSlot;
  if (slot && slot.view === state.view) {
    return normalizeFocus(slot);
  }
  if (state.view === 'day') {
    const staffList = selectStaffSorted(state);
    const staffId = slot?.staffId ?? staffList[0]?.id;
    if (!staffId) return undefined;
    return normalizeFocus({
      view: 'day',
      dateISO: state.dateISO,
      staffId,
      minute: slot?.minute,
    });
  }
  if (state.view === 'week') {
    return normalizeFocus({
      view: 'week',
      dateISO: slot?.dateISO ?? state.dateISO,
      staffId: slot?.staffId,
      minute: slot?.minute,
    });
  }
  return undefined;
}

function shiftMinutes(
  state: CalendarState,
  delta: number
): Partial<CalendarState> | undefined {
  if (state.view !== 'day' && state.view !== 'week') return undefined;
  const slot = ensureFocusForActiveView(state);
  if (!slot) return undefined;
  const minute = clampMinuteValue((slot.minute ?? 0) + delta);
  if (minute === slot.minute) return undefined;
  return { focusedSlot: { ...slot, minute } };
}

function setMinute(
  state: CalendarState,
  minute: number
): Partial<CalendarState> | undefined {
  if (state.view !== 'day' && state.view !== 'week') return undefined;
  const slot = ensureFocusForActiveView(state);
  if (!slot) return undefined;
  const clamped = clampMinuteValue(minute);
  if (clamped === slot.minute) return undefined;
  return { focusedSlot: { ...slot, minute: clamped } };
}

function shiftHorizontal(
  state: CalendarState,
  delta: number
): Partial<CalendarState> | undefined {
  if (state.view === 'day') {
    return shiftStaff(state, delta);
  }
  if (state.view === 'week') {
    return shiftWeekDay(state, delta);
  }
  return undefined;
}

function shiftStaff(
  state: CalendarState,
  delta: number
): Partial<CalendarState> | undefined {
  const slot = ensureFocusForActiveView(state);
  if (!slot || slot.view !== 'day') return undefined;
  const staffList = selectStaffSorted(state);
  if (!staffList.length) return undefined;
  const currentIndex = slot.staffId
    ? staffList.findIndex((s) => s.id === slot.staffId)
    : 0;
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = Math.max(0, Math.min(safeIndex + delta, staffList.length - 1));
  if (nextIndex === safeIndex) return undefined;
  const nextStaff = staffList[nextIndex];
  return { focusedSlot: { ...slot, staffId: nextStaff.id } };
}

function shiftWeekDay(
  state: CalendarState,
  delta: number
): Partial<CalendarState> | undefined {
  const slot = ensureFocusForActiveView(state);
  if (!slot || slot.view !== 'week') return undefined;
  const current = new Date(slot.dateISO);
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() + delta);
  const bounds = state.weekFocusBounds;
  if (bounds) {
    const start = new Date(bounds.startISO);
    start.setHours(0, 0, 0, 0);
    const end = new Date(bounds.endISO);
    end.setHours(0, 0, 0, 0);
    if (current < start) {
      current.setTime(start.getTime());
    } else if (current > end) {
      current.setTime(end.getTime());
    }
  }
  const nextISO = current.toISOString();
  if (nextISO === slot.dateISO) return undefined;
  return { focusedSlot: { ...slot, dateISO: nextISO } };
}

function pageShift(
  state: CalendarState,
  direction: number
): Partial<CalendarState> | undefined {
  if (state.view === 'day') {
    return pageDay(state, direction);
  }
  if (state.view === 'week') {
    return pageWeek(state, direction);
  }
  return undefined;
}

function pageDay(
  state: CalendarState,
  direction: number
): Partial<CalendarState> | undefined {
  const slot = ensureFocusForActiveView(state);
  if (!slot || slot.view !== 'day') return undefined;
  const base = addDays(new Date(state.dateISO), direction);
  const nextDateISO = base.toISOString();
  return {
    dateISO: nextDateISO,
    focusedSlot: { ...slot, dateISO: nextDateISO },
  };
}

function pageWeek(
  state: CalendarState,
  direction: number
): Partial<CalendarState> | undefined {
  const slot = ensureFocusForActiveView(state);
  if (!slot || slot.view !== 'week') return undefined;
  const deltaDays = direction * 7;
  const base = addDays(new Date(state.dateISO), deltaDays);
  const nextDateISO = base.toISOString();
  const nextSlotISO = addDays(new Date(slot.dateISO), deltaDays).toISOString();
  return {
    dateISO: nextDateISO,
    focusedSlot: { ...slot, dateISO: nextSlotISO },
  };
}

let lastStaffRef: CalendarState['staff'] | null = null;
let lastStaffSorted: Staff[] = [];

export const selectStaffSorted = (state: CalendarState): Staff[] => {
  if (state.staff === lastStaffRef) {
    return lastStaffSorted;
  }
  const next = Object.values(state.staff).slice().sort((a, b) => a.name.localeCompare(b.name));
  lastStaffRef = state.staff;
  lastStaffSorted = next;
  return next;
};

type EventsCache = Map<string, Event[]>;
type StaffEventsCache = Map<string, Map<StaffId, Event[]>>;

const eventsByDayCache = new WeakMap<CalendarState['events'], EventsCache>();
const eventsByDayStaffCache = new WeakMap<CalendarState['events'], StaffEventsCache>();

function ensureDayCache(eventsRef: CalendarState['events']): EventsCache {
  let cache = eventsByDayCache.get(eventsRef);
  if (!cache) {
    cache = new Map();
    eventsByDayCache.set(eventsRef, cache);
  }
  return cache;
}

function ensureDayStaffCache(eventsRef: CalendarState['events']): StaffEventsCache {
  let cache = eventsByDayStaffCache.get(eventsRef);
  if (!cache) {
    cache = new Map();
    eventsByDayStaffCache.set(eventsRef, cache);
  }
  return cache;
}

export const selectEventsForLocalDay = (dateISO: string) => {
  const dayKey = localDayKey(dateISO);
  return (state: CalendarState): Event[] => {
    const eventsRef = state.events;
    const dayCache = ensureDayCache(eventsRef);
    const cached = dayCache.get(dayKey);
    if (cached) return cached;
    const computed = Object.values(eventsRef)
      .filter((ev) => sameLocalDay(ev.start, dateISO))
      .sort(compareByStart);
    dayCache.set(dayKey, computed);
    return computed;
  };
};

export const selectEventsForLocalDayByStaff = (dateISO: string, staffId: StaffId) => {
  const dayKey = localDayKey(dateISO);
  const daySelector = selectEventsForLocalDay(dateISO);
  return (state: CalendarState): Event[] => {
    const eventsRef = state.events;
    const staffCache = ensureDayStaffCache(eventsRef);
    let byDay = staffCache.get(dayKey);
    if (!byDay) {
      byDay = new Map();
      staffCache.set(dayKey, byDay);
    }
    const cached = byDay.get(staffId);
    if (cached) return cached;
    const baseEvents = daySelector(state);
    const filtered = baseEvents.filter((ev) => ev.staffId === staffId);
    byDay.set(staffId, filtered);
    return filtered;
  };
};

export function focusRestoreAnchor() {
  const { focusAnchor } = useCalendar.getState();
  if (focusAnchor && typeof focusAnchor.focus === 'function') {
    const focusFn = () => focusAnchor.focus({ preventScroll: true });
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focusFn);
    } else {
      focusFn();
    }
  }
  useCalendar.setState({ focusAnchor: null });
}
