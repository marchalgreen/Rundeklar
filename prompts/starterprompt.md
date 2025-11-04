🧭 Starter Prompt — VisionSuite “Desktop Web” + Booking Kalender

Project overview
• Stack: Next.js 15 + React 19 + TypeScript, App Router.
• UI: desktop-style windowing in browser (multiple draggable/resizable windows, taskbar, topbar).
• Styling: Tailwind v4, themed via CSS variables in globals.css.
• State: zustand; windowing/actions live in store/desktop.ts.
• Dragging/resizing: react-rnd for windows; calendar grid uses pointer events (no SSR-only APIs).
• Icons: lucide-react.
• Platform context (VisionSuite): MVP spans customer records, appointment calendar (with SMS/email reminders + staff planning), and inventory/orders; later: AI-assisted notes, analytics, supplier integrations. Calendar aims to cut no-shows, support multi-staff schedules, and be audit-friendly (timestamps, changes). ￼

Repo structure (authoritative)

package.json # next, react, zustand, react-rnd, tailwindcss, lucide-react
tailwind.config.ts # maps CSS vars → Tailwind tokens
src/
app/
layout.tsx
page.tsx
globals.css # theme tokens & base utilities
api/
calendar/
events/route.ts # GET/POST mock events
availability/route.ts # GET staff availability
reminders/route.ts # POST enqueue reminder (mock)
components/
desktop/ # DesktopShell, TopBar, Taskbar, Window, registry
ui/ # shared buttons, inputs, popovers, dropdowns
calendar/
CalendarWindow.tsx # Window wrapper around calendar views
CalendarToolbar.tsx # view switching, date nav, filters
CalendarGrid.tsx # week/day grid, drag/resize to create/move
CalendarMonth.tsx # month view (compact)
EventCard.tsx # floating card / popover content
ResourceColumn.tsx # staff/resource column
TimeAxis.tsx # time ruler (08:00–18:00 by default)
Legend.tsx # statuses (booked, tentative, no-show, blocked)
windows/
BookingCalendar.tsx # registers as a desktop window
CustomerCard.tsx
lib/
calendar/
time.ts # date utils, slots, overlap detection
constraints.ts # work-area & business-hours rules
conflicts.ts # conflict detection, snapping, smart suggestions
reminders.ts # schedule calculation (T-24h, T-2h), mock sender
serialization.ts # Zod schemas <-> wire types
http.ts # fetch wrapper, with retry & mock-delay opt-in
hotkeys/GlobalHotkeys.tsx
store/
desktop.ts # windowing store (open/close/focus/minimize/restore)
calendar.ts # calendar slice (filters, selection, drafts, drag state)
mocks/
calendar/
events.json # seed events
staff.json # staff/resources
customers.json # minimal CRM refs for attendees
reminders.json # queued “outbox”
seed.ts # in-memory loader for API routes

Key conventions
• Colors & theme
HSL variables in globals.css (tokens: --surface, --surface-2, --border, --muted, --foreground, --accent, --ring, background hues --bg-aqua-_, glass tints --glass-_). Tailwind extends to bg-surface, border-border, text-foreground, etc. Edit tokens first; avoid hardcoded colors.
• UI shell
DesktopShell renders background + TopBar + Taskbar + desktop icons + windows. Bars use translucent glass surfaces.
• Windows
Window.tsx is the only draggable/resizable chrome. All feature UIs mount inside it. Respect the work area (below TopBar, above Taskbar) and keep RND bounds to that rect.
• Windowing model
store/desktop.ts manages open/close/focus/minimize/restore/toggleMaximize/moveResize; order[] controls z-stack (last = focused).
• Hotkeys
GlobalHotkeys.tsx binds: focus cycling, minimize/maximize/close, snap left/right/top/bottom, and calendar-local bindings (see below). Never hijack inputs when a text field is focused.
• Accessibility/SSR
Semantic HTML only (no nested <button>). No direct window access during SSR. Components must be hydration-safe.

Booking Kalender — Epic (MVP)

Goals (platform-aligned)
• Multi-staff, multi-resource booking with day/week/month views.
• Reduce no-shows via SMS/email reminders and quick rescheduling.
• Fast in-grid create/move/resize, conflict detection, snap to business hours.
• Staff availability + room/equipment blocking.
• Auditability (created/updated/by/timestamp); GDPR-aware; all mock for now. ￼

Data model (TypeScript + Zod)

// src/lib/calendar/serialization.ts
import { z } from "zod";

export const StaffId = z.string().brand<"StaffId">();
export const CustomerId = z.string().brand<"CustomerId">();
export const EventId = z.string().brand<"EventId">();
export const ResourceId = z.string().brand<"ResourceId">();

export const EventStatus = z.enum(["booked","tentative","checked_in","completed","no_show","cancelled"]);
export const ReminderChannel = z.enum(["sms","email"]);

export const Event = z.object({
id: EventId,
title: z.string(),
customerId: CustomerId,
staffId: StaffId,
resourceId: ResourceId.optional(), // room/equipment
start: z.string(), // ISO
end: z.string(), // ISO
status: EventStatus,
notes: z.string().optional(),
createdBy: z.string(), updatedBy: z.string(),
createdAt: z.string(), updatedAt: z.string(),
});

export const Staff = z.object({
id: StaffId, name: z.string(), role: z.enum(["optometrist","assistant","admin"]),
color: z.string().optional(), // Tailwind token key (not raw hex)
businessHours: z.record(z.enum(["mon","tue","wed","thu","fri","sat","sun"]), z.array(z.tuple([z.string(), z.string()]))),
});

export const Availability = z.object({
staffId: StaffId,
date: z.string(), // YYYY-MM-DD
blocks: z.array(z.tuple([z.string(), z.string()])), // [start,end] ISO
});

export const Reminder = z.object({
id: z.string(),
eventId: EventId,
channel: ReminderChannel,
when: z.string(), // ISO
payload: z.record(z.any()),
status: z.enum(["queued","sent","failed"]),
});

Mock data (authoritative for now)
• mocks/calendar/events.json — ~30 seed events across 2 weeks, mixed statuses (booked/tentative/no_show).
• mocks/calendar/staff.json — 3–5 staff with businessHours (08:00–18:00 weekdays, optional Sat).
• mocks/calendar/customers.json — minimal {id, name, phone, email}.
• mocks/calendar/reminders.json — empty initially; API writes queue entries.
• src/mocks/seed.ts — loads files into an in-memory module singleton used by API route handlers. Exports getters/mutators with optimistic IDs and timestamping.

Rule: all mocks round-trip through Zod schemas; API returns camelCase JSON; dates are ISO; no UI-only shape.

API (Next.js route handlers; mock-backed)
• GET /api/calendar/events?from=ISO&to=ISO&staffId=&resourceId= → [Event]
• POST /api/calendar/events with Event (id optional → server assigns) → created event
• PATCH /api/calendar/events/:id → partial update (status, time changes, notes)
• DELETE /api/calendar/events/:id
• GET /api/calendar/availability?date=YYYY-MM-DD&staffId= → [Availability]
• POST /api/calendar/reminders with {eventId, channels:["sms","email"]} → enqueues Reminder entries at T-24h and T-2h (mock)
• All mutations append audit fields (updatedBy, updatedAt) and push an entry to a simple in-memory audit log (lib/audit.ts).

State (zustand slice)

// src/store/calendar.ts
type View = "day" | "week" | "month";
type Filters = { staffIds: string[]; resourceIds: string[]; status: EventStatus[] };
type Draft = { start: string; end: string; staffId?: string; resourceId?: string; title?: string };

interface CalendarState {
view: View; dateISO: string; filters: Filters;
events: Record<string, Event>; staff: Record<string, Staff>;
loading: boolean; selection?: { eventId?: string; range?: [string,string] };
draft?: Draft; dragging?: { eventId: string } | { range: [string,string] };
init(): Promise<void>;
setView(v: View): void; setDate(iso: string): void; setFilters(p: Partial<Filters>): void;
create(e: Draft & { customerId: string; staffId: string; title: string }): Promise<Event>;
update(id: string, patch: Partial<Event>): Promise<Event>;
remove(id: string): Promise<void>;
enqueueReminders(id: string, channels: ("sms"|"email")[]): Promise<void>;
}

Calendar UI behaviors
• Views: Week (default), Day, Month. Fast navigation: today, prev/next, jump to date.
• Grid: 15-min slots; drag to create (opens EventCard in “draft”); drag-move/resize with:
• Snapping to 5/15-min increments and to business hours.
• Bounds = work area (window chrome excluded) + staff column height.
• Conflicts: show red outline + tooltip. Allow override with Alt + drop, but log conflict.
• Resources: Toggle column per staff/resource; sticky TimeAxis.
• Statuses & Legend: booked (solid), tentative (striped), checked_in, completed (dim), no_show (dashed), cancelled (muted).
• Quick actions: check-in, complete, mark no-show, duplicate, reschedule (next slot with same staff). One-keystroke actions listed below.
• Performance: Virtualize rows (time slots) and columns (staff) for large schedules.
• Accessibility: keyboard creation/move (arrow keys), Enter to open editor, Esc to cancel.

Hotkeys (global vs. local)
• Global (unchanged): focus windows (Alt+\``), minimize (Ctrl+M), maximize (Ctrl+Enter), close (Ctrl+W), snap (Win/Meta` + arrows).
• Calendar-local (only when Calendar has focus and not typing):
• N new draft at cursor time; D duplicate; Del delete.
• S cycle status → booked → checked_in → completed.
• R quick-reschedule to next free slot; T toggle tentative.
• Arrows move selected event by 15m; with Shift resize by 15m.

Visual & motion rules
• Use theme tokens (bg-surface, border-border, text-foreground); no raw colors.
• Animations 150–220ms cubic-bezier; prefer opacity, transform.
• Translucent bars/windows via glass tokens; adjust tint in globals.css if needed.

File additions (full paths & integration) 1. src/windows/BookingCalendar.tsx
Registers a “Booking Calendar” window in the desktop registry (title, icon, default size/pos). Mounts components/calendar/CalendarWindow.tsx. 2. src/components/calendar/_ (listed above)
• CalendarWindow.tsx wires store + toolbar + view; subscribes to store/calendar.ts.
• CalendarGrid.tsx handles in-grid interactions using RND only for popover editor, not cells. 3. src/store/calendar.ts
Zustand slice as defined; initialize by await /api/calendar/events + /availability for week. 4. src/app/api/calendar/_
Route handlers using mocks/seed.ts. Add config = { runtime: "edge" } only if not using Node-APIs. 5. src/lib/calendar/_ helpers (time, constraints, conflicts, reminders, serialization). 6. src/mocks/_ JSON + seed.ts.

Mock reminder pipeline
• POST /api/calendar/reminders generates two Reminder items per channel (T-24h & T-2h).
• Mock “sender” updates status → sent instantly unless ?fail=1 is set on the request (for error flows).
• Reminder payload interpolates {customer.name}, {when}, {store.phone}; keep templates in lib/calendar/reminders.ts.

Validation, errors, and audit
• All API inputs validated via Zod; return 422 on invalid payloads.
• Conflicts: API returns 409 with {conflicts:[{eventId, overlapRange}]}; UI shows toast + highlight.
• Audit: lib/audit.ts appends {ts, actor, action, before?, after?} for create/update/delete/statusChange.

Testing (lightweight, dev-first)
• Unit: lib/calendar/\*.test.ts for overlaps, snapTo, businessHours, nextAvailableSlot.
• Component: render CalendarGrid with mock props; verify drag/resize callbacks.
• API: route handler tests with Node fetch and seeded memory store.
• Playwright smoke (optional): open calendar window, create/move/delete event.

Acceptance criteria (MVP done when…)
• Week/Day/Month views render with virtualized slots; switching is <16ms commit on mid laptop.
• Create/move/resize works with snapping & conflict feedback; can override with Alt.
• Filter by staff/resource; business hours respected; outside hours dimmed.
• Status transitions available (booked→checked_in→completed; mark no_show).
• Reminders can be enqueued (mock) and visible in an “Outbox” list (read from mocks/calendar/reminders.json).
• All network calls go through lib/http.ts (retry/backoff; dev-only artificial delay).
• No window can cross TopBar/Taskbar bounds; calendar window restores last size/pos from desktop store.
• No UI uses hardcoded colors; SSR passes (no window on server).

Future database integration (Postgres plan — not implemented now)
• Tables: customers, staff, resources, events, reminders, audit_log.
• Migrations mirror the Zod schemas (1:1 columns; status enums); timestamps UTC.
• Replace mocks/seed.ts with repository layer (lib/db/\*) keeping the same API shapes, so UI doesn’t change.
• Add indices on (staff_id, start, end), (customer_id), (status).
• For later: queue/reminders via pg-boss or cron worker.

⸻

Editing guidelines (enforced)
• Always use Tailwind tokens (never hex/rgba). Prefer changing CSS variables in globals.css for visual tweaks.
• Logic must stay consistent with store/desktop.ts (focus, snapping, hotkeys).
• Full files for edits; when adding files, show paths + how they hook in.
• Keep HTML semantic; hydration-safe components; avoid browser-only APIs during SSR.
• Favor short, smooth animations; keep render paths light (memoize heavy selectors).

⸻

What a contributor needs to know at a glance
• The stack & theming system, project layout, and where each concern lives.
• How the Booking Kalender works, its data shapes, and how to add/modify events.
• Where to put mock data now and how we’ll swap to Postgres later with no UI changes.
• Visual/behavioral rules that make this feel like a coherent desktop OS inside the browser.
