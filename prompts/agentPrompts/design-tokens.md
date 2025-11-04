🎨 Design Tokens & UI Conventions (Tailwind v4)

🧩 Token Source & Mapping

All tokens live as CSS custom properties inside globals.css.  
They’re exposed to Tailwind through tailwind.config.ts:

• theme.extend.colors maps:
• surface, surface-2, border, muted, foreground
• accent, accent-2, ring, accent-blue
• ringColor.DEFAULT → --ring
• @theme inline ensures system vars bind to Tailwind’s --color-\* slots

🧠 Always use `hsl(var(--token))` — never raw hex or RGB.  
Tailwind handles HSL interpolation automatically for light/dark balance.

⸻

🌈 Core HSL / OKLCH Tokens

🩶 Surfaces & Text

| Token          | Purpose                    |
| -------------- | -------------------------- |
| `--surface`    | Primary background surface |
| `--surface-2`  | Elevated glass / cards     |
| `--border`     | Hairlines, outlines        |
| `--muted`      | Subtle text, icons         |
| `--foreground` | Default text color         |

🔵 Accents & Focus

| Token           | Purpose                   |
| --------------- | ------------------------- |
| `--accent`      | Primary accent            |
| `--accent-2`    | Secondary accent          |
| `--ring`        | Focus outlines            |
| `--accent-blue` | macOS blue highlight tone |

🌊 Background & Desktop Flourish

| Token             | Purpose                          |
| ----------------- | -------------------------------- |
| `--bg-aqua-1/2/3` | Desktop vignette gradient layers |

🩸 Semantic & System Sets

| Token           | Purpose                             |
| --------------- | ----------------------------------- |
| `--destructive` | Errors / destructive actions        |
| `--chart-1..5`  | Chart series palette                |
| `--sidebar-*`   | Sidebar background / text hierarchy |

📅 Calendar & Event Grids

| Token                                               | Purpose                                                |
| --------------------------------------------------- | ------------------------------------------------------ |
| `--grid-bg`, `--grid-hour-line`, `--grid-half-line` | Calendar grid line system                              |
| `--grid-accent`                                     | Highlighted hour / current time marker                 |
| `--event-border`, `--event-shadow`                  | Appointment card styling                               |
| `--line`                                            | Global hairline; used across grid, headers, docs cards |

🧾 Service / Domain Hues

Used across modules (inventory, logbook, calendar):

–svc-eyeexam
–svc-lenses
–svc-check
–svc-repair
–svc-other
–svc-pickup
–svc-glasses

Dark theme overrides live under `.dark { … }`.  
Each token flips contrast and surface opacity — never duplicate colors.

⸻

🩶 Hairlines & Rings (global rule)

**Rule:** Borders are replaced by rings everywhere for physical hairlines and doc cards.

✅ Use:

<div className="ring-1 ring-[hsl(var(--line)/.12)]" />

❌ Avoid:

<div className="border border-[hsl(var(--line))]" />

Context Token / Utility
Header separators shadow-[inset_0_-1px_0_hsl(var(--line)/.08)]
Docs & cards ring-1 ring-[hsl(var(--line)/.12)]
Glass modals bg-white/85 ring-[hsl(var(--line)/.10)]
Tables (grid lines) ring-inset ring-[hsl(var(--line)/.10)]

Global token lightness baseline:

:root {
--line: 215 16% 96%;
}
.dark {
--line: 215 10% 25%;
}

This keeps separation visible on light glass without black or opaque borders.

⸻

🧰 Ready Utility Classes

Utility Description
.u-glass Frosted glass layer with backdrop blur
.card-glass-active Active window card surface
.card-glass-inactive Dimmed / backgrounded card surface
.app-bg, .bg-grid, .bg-grid-stripes, .bg-paper(-2) App backgrounds and textures
.border-hair, .hairline-b, .hairline-y 1 px physical hairline utilities
.ring-focus Global focus ring standard
.tahoe-input Base input field style
.tahoe-ghost Transparent button (macOS ghost style)
.win-frame Window wrapper with shadow + border
[data-active], .titlebar-active Active window focus states
[data-desk='muted'] Background dimming for inactive windows
.event--tentative, .event--no-show, .event--cancelled Event state cues
Animations: freezePop, blitzFlash Used in scanner/feedback components

⸻

🧭 UI Patterns & Motion Rules

• shadcn/ui first – use its primitives + Lucide icons
• Radius system: --radius-{sm,md,lg,xl} → token-driven curves
• Motion: 120–240 ms, easing = cubic-bezier(.2,.8,.2,1)
• Reduced motion: respect prefers-reduced-motion
• Elevation: subtle layered glass; only .win-frame gets active shadow
• Typography:
• Compact and clinical
• Labels → text-xs text-muted
• Calm contrast; no all-caps except system tags

⸻

✅ Do & ❌ Don’t

✅ Do ❌ Don’t
Use hsl(var(--token)) for all color references Hardcode colors or hex values
Use Tailwind utilities with tokens Add custom CSS unless for core tokens
Keep window chrome (buttons, radius, shadows) consistent Create isolated visual systems per feature
Respect .ring-focus and a11y focus states Remove focus rings or override outline
Extend tokens via config only Inline new color variables in components

⸻

✨ Philosophy

Every element in Clairity should:
• Feel light, layered, and alive
• Never draw unnecessary attention
• Stay visually consistent whether in window, modal, or desktop context

The design system’s job is to feel invisible — only clarity should stand out.
