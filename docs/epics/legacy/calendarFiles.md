🧭 Top-Level Calendar Components

These define the main layout, toolbar, and window shell.

File Purpose
src/components/calendar/CalendarWindow.tsx The main calendar container — wraps everything (toolbar, sidebar, grid, inspector, dialogs).
src/components/calendar/CalendarToolbar.tsx The header bar — shows date, view switch (Dag/Uge/Måned), arrows, and week-start toggle.
src/components/calendar/CalendarGrid.tsx The day view — shows one day across multiple staff columns.
src/components/calendar/WeekGrid.tsx The week view — shows 7 days (Mon–Sun or today→+6 days) with one column per day.
src/components/calendar/WeekDayColumn.tsx A single day column in the week view — handles overlaps, create-by-drag, “+N mere” popover.
src/components/calendar/ResourceColumn.tsx A single staff column in the day view — handles overlaps, create-by-drag, “+N mere” popover.

⸻

🧩 Subcomponents

Smaller building blocks reused across views.

File Purpose
src/components/calendar/parts/EventChip.tsx The event “pill” — shows title, time, color, and service icon. Handles drag/resize.
src/components/calendar/parts/NowLine.tsx The red “current time” line that moves live through the grid.
src/components/calendar/parts/TimeAxis.tsx The left-hand time ruler (08:00 → 18:00).
src/components/calendar/parts/AllDayRow.tsx (optional) Placeholder for all-day events (we can use this later).
src/components/calendar/parts/services.ts Centralized definition of service types — color hues, labels, and icons (SERVICE_META).

⸻

🧠 Sidebar & Inspector

Left mini-month view and right event details panel.

File Purpose
src/components/calendar/MiniSidebar.tsx Left sidebar — mini-month picker, “Gå til i dag” button, and event type legend.
src/components/calendar/parts/MiniMonth.tsx The interactive mini-month calendar inside the sidebar.
src/components/calendar/EventInspector.tsx Right-hand panel — shows details of the selected event (title, time, notes, etc.).

⸻

⚙️ Dialogs & Menus

Context menu, delete confirm, move confirm, etc.

File Purpose
src/components/calendar/ContextMenu.tsx Right-click context menu (edit, delete, assign staff, change type).
src/components/calendar/DeleteConfirm.tsx shadcn AlertDialog for confirming event deletion.
src/components/calendar/MoveConfirm.tsx shadcn Dialog for confirming cross-staff drag/drop (“Flyt aftale”).

⸻

🧱 Store & Logic

Persistent calendar data and drag state.

File Purpose
src/store/calendar.ts Zustand store — all event, staff, draft, and drag/drop state lives here.
src/lib/mock/customers.ts (optional) Mock customer data (for linking to events).

⸻

🖼 Styling / Utility

Global styling and constants that affect calendar look & feel.

File Purpose
src/app/globals.css Tailwind CSS variables (colors, surfaces, borders, etc.) — sets the theme.
tailwind.config.ts Tailwind config with plugin imports (tailwindcss-animate, custom tokens).
src/components/ui/ shadcn UI components used across the calendar (button, dialog, popover, switch, etc.).

⸻

Optional / Extended

If you later add these:

File Purpose
src/components/calendar/MonthGrid.tsx A true month view (we haven’t implemented yet).
src/components/calendar/parts/AllDayRow.tsx Row for all-day events (if you want that later).
