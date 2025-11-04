// Central opening sizes (and optional min sizes) per window type.
// Keys must match the `type` you pass to open({ type: '...' }).

export type WindowDefault = {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  // vertical offset from top when centered (before cascade)
  topOffset?: number;
};

// NOTE: This file is intentionally "dumb": string keys so it doesn't depend on store types.
// The store imports this and indexes by `opts.type`.

export const WINDOW_DEFAULTS: Record<string, WindowDefault> = {
  // Kundekort (customer card)
  customerForm: { w: 1040, h: 760, minW: 720, minH: 480, topOffset: 18 },

  // Back-compat alias (safe to keep or remove once everything uses `customerForm`)
  customer: { w: 1040, h: 760, minW: 720, minH: 480, topOffset: 18 },

  // Search
  kundekort_search: { w: 920, h: 660, minW: 680, minH: 420, topOffset: 24 },

  // Journal
  synsJournal: { w: 1100, h: 900, minW: 900, minH: 640, topOffset: 10 },

  // Logbook / notes
  logbook: { w: 900, h: 700, minW: 700, minH: 520, topOffset: 18 },

  // Inventory / orders
  inventory: { w: 1200, h: 820, minW: 900, minH: 600, topOffset: 12 },

  inventoryDashboard: { w: 1020, h: 720, minW: 720, minH: 520, topOffset: 16 },

  // Inventory / orders
  itemDetail: { w: 1200, h: 820, minW: 900, minH: 600, topOffset: 12 },

  // Purchase requests
  purchaseRequest: { w: 1040, h: 760, minW: 720, minH: 560, topOffset: 18 },

  // Help / tools
  hotkeys_help: { w: 760, h: 560, minW: 560, minH: 420, topOffset: 32 },

  // Calendar (singleton)
  booking_calendar: { w: 1280, h: 860, minW: 1024, minH: 720, topOffset: 6 },

  // Add more as you introduce new window types:
  // smsComposer:    { w: 520,  h: 420, minW: 420, minH: 320, topOffset: 36 },
};
