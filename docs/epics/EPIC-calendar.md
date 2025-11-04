Calendar Booking Module

Executive Summary
• The Calendar module provides day/week/month booking surfaces, availability search, event CRUD, and reminder queuing for Clairity’s desktop workspace. It’s implemented as a windowed client UI with a small App Router API surface under /api/calendar/**.
• UI state is centralized in a Zustand slice (src/store/calendar.ts) exposing typed events, staff, selection/drag state, keyboard navigation, and optimistic updates to API routes. The rendering stack includes grids, columns, an inspector, dialogs, and a context menu under src/components/calendar/**.
• This plan sets the canonical architecture, capabilities, API surface, scheduling logic, and validation gates so we can wipe legacy calendar docs and regenerate trustworthy documentation from this source of truth.

⸻

1. Architecture Overview

1.1 Runtime & Framework
• Framework — Next.js 15 App Router; API routes under src/app/api/calendar/\*\*. UI runs inside the desktop window system. ￼
• Language & Tooling — TypeScript 5 (strict), Tailwind v4, shadcn/ui, Prettier + ESLint via pnpm run validate. ￼
• State — Zustand store useCalendar() with typed actions (create/update/remove, drag/resize, keyboard navigation, focus management).
• Design System — HSL tokens in globals.css (e.g., --grid-bg, --grid-hour-line, --line, --accent-blue), ring-based hairlines, and macOS/Tahoe motion. ￼

1.2 Module Layout

Path Purpose
src/store/calendar.ts Source of truth for calendar state (events, staff, selection), actions (create/update/remove), drag/resize, keyboard navigation, and focus handling.
src/lib/calendar/time.ts Time math utilities (snap/round, minutes↔pixels, ISO transforms, local day keys).
src/lib/calendar/overlap.ts Overlap layout engine for concurrent events, with visibility caps and grouping.
src/lib/calendar/config.ts Tunables: day start/end, px-per-minute, min slot, drag threshold, max visible overlaps.
src/components/calendar/** Window, grids (day/week/month), columns, toolbar, context menu, dialogs (delete/move/details), mini-month, inspector.
src/windows/BookingCalendar.tsx + src/components/desktop/windowRegistry.tsx Mount the Calendar window into the desktop system. ￼
src/app/api/calendar/** App Router handlers for events, events/[id], availability, reminders.

⸻

2. Capabilities
   • Views — Day, Week, Month; switchable via toolbar (useCalendar().setView), with date paging.
   • Create & Edit — Click/drag to create ranges; drag to move; resize start/end; inline editor modal; move confirmation when crossing staff lanes.
   • Selection & Focus — Keyboard addressable slots with home/end/page and arrow navigation; explicit focus restore anchor for a11y.
   • Conflict Handling — Overlap computation groups colliding events and caps visible columns; hidden counter per group.
   • Availability — Stubbed availability endpoint returns working hours for staff; UI uses businessHours for rendering constraints.
   • Reminders — Queue reminders via API stub; notification kinds include calendar.
   • Optimistic Updates — Client mutates local store immediately; reconciles PATCH responses with normalization rules.

⸻

3. UI & Interaction Model

3.1 Window & Shell
• CalendarWindow.tsx: top toolbar, left mini sidebar, main scroller with grid overlays (hour/half lines using --grid-hour-line/--grid-half-line), and right inspector. Keyboard listener handles Arrow/Home/End/PageUp/PageDown/Enter/Escape with early bail-outs when typing.

3.2 Grids & Columns
• Day view uses ResourceColumn per staff; Week view uses WeekDayColumn; Month view composes MonthGrid/MonthDayCell.
• ResourceColumn and WeekDayColumn own pointer/keyboard creation flows: beginRange → updateRange → commitRange and the Enter/Space create shortcuts.
• NowLine draws the current time only for today within CALENDAR_DAY_START..END.

3.3 Context, Inspector & Dialogs
• ContextMenu (escape/arrow keyboard support), EventInspector (details + quick patch), EventDetailsDialog (rich editing), DeleteConfirm, MoveConfirm.

3.4 Keyboard Model (high level)
• Navigation in day/week: Arrow keys move time/staff or weekday; Home/End clamp; PageUp/Down shift day/week; Enter opens editor; Esc clears selection or restores focus anchor.

⸻

4. API Surface (App Router)

Route Methods Purpose Notes
/api/calendar/events GET, POST List events (stub returns []); create returns body with fake id. No auth; optimistic client create reconciles with response.
/api/calendar/events/[id] PATCH, DELETE Update or delete a single event; in-memory map per process. Used by drag/resize and editor commits.
/api/calendar/availability GET Return demo staff availability (business hours). Drives UI constraints.
/api/calendar/reminders POST Queue reminder(s) for an event; returns queued entries. Stubbed channel + timestamp.

The Epic keeps this surface explicit and minimal; deeper persistence or policy checks can be added later via a separate backend epic, per guardrails. ￼

⸻

5. Scheduling Logic (from lib/calendar)
   • Time math (time.ts):
   • minutesToPixels / pixelsToMinutes, isoAtDayMinutes, isoToDayMinutes, durationMinutes, localDayKey, compareByStart, startOfWeekMonday, isToday, and snapMinutes.
   • Layout & overlaps (overlap.ts):
   • Produces positioned events with top/height/col/cols/gid.
   • Tracks groups with maxCols and hiddenCount; enforces CALENDAR_MAX_VISIBLE_OVERLAPS (default 3) for condensed lanes.
   • Config (config.ts):
   • CALENDAR_DAY_START, CALENDAR_DAY_END, CALENDAR_PX_PER_MIN, CALENDAR_MIN_SLOT_MIN, CALENDAR_CLICK_DEFAULT_MIN, CALENDAR_DRAG_THRESHOLD_PX, CALENDAR_MIN_EVENT_HEIGHT_PX.

These values inform acceptance criteria (e.g., min slot = 15m; click creates 30m by default).

⸻

6. Accessibility & Design System
   • Tokens — Use --grid-bg, --grid-hour-line, --grid-half-line, --line, and service hues; replace hard borders with ring-1 ring-[hsl(var(--line)/.12)]. ￼
   • Focus & Keyboard — .ring-focus, skip nested traps, honor focus restore anchor after dialogs/menus; all creation and editing flows keyboardable.
   • Motion — 120–240 ms cubic-bezier(.2,.8,.2,1); respect prefers-reduced-motion. ￼
   • Guardrails — Tailwind tokens only; shadcn/ui primitives; no new UI deps; zero schema changes unless explicitly planned. ￼

⸻

7. Validation & Operational Notes
   • Required gates — pnpm run validate → typecheck + lint; pnpm build (Next + Prisma generate); manual smoke on Calendar window. ￼
   • Manual smoke — Open the Calendar window; test:
   • create range (mouse + keyboard Enter/Space), drag/resize, cross-staff move (requires confirm), delete, open editor with Enter, Esc to clear/restore focus.
   • check NowLine visibility and hour grid lines; ensure focus rings visible.
   • Performance — Large day/weekly schedules must scroll smoothly; avoid heavy work in render paths (caches are present in store selectors).

⸻

8. Next Steps & Gaps

Area Action
Persistence Replace stubbed handlers with Prisma-backed storage + idempotency keys; add auth checks (store/employee session).
Availability Expand GET /availability to include templates/overrides; add POST endpoints for templates and single-day overrides.
Webhooks & ICS Introduce signed webhooks and authenticated ICS import endpoints (documented off the new epic, not legacy pages).
OpenAPI Generate OpenAPI spec + Swagger embed from handlers; move “calendarOpenAPI” under lib/docs if still required.
A11y polish Add ARIA live regions for drag/resize announcements; ensure inspector and dialogs set initial focus; complete tab order audit.
Docs Regeneration Use this Epic as the single source of truth to scaffold /docs/calendar/\*\* pages via Codex (Quickstart, API, UI guide, Swagger).

⸻

9. Acceptance Criteria (testable)
   • Views — Day/Week/Month switch reliably; paging changes date and maintains focus slot.
   • Create — Mouse drag and Enter/Space create 30m events snapped to 15m grid; overlapping events render with compact columns; hidden counter increments beyond 3 visible overlaps.
   • Edit — Drag/resize respects min height and boundaries; cross-staff move in day view requires confirmation; optimistic state reconciles with API responses.
   • Keyboard — Arrow/Home/End/Page keys adjust time/staff/weekday per store logic; Enter opens editor for selected event; Esc clears state or restores focus anchor.
   • API — /events (GET/POST), /events/[id] (PATCH/DELETE), /availability (GET), /reminders (POST) respond as specified; UI remains functional if handlers return stubs.
   • Design system — No hard borders; all hairlines use rings; tokens only; visible focus rings; motion respects reduced-motion.

⸻
