Clairity — Desktop-Web (Project Context)

**See also:**
- [README.md](./README.md) - Master index and quick reference
- [guards.md](./guards.md) - Complete engineering guardrails
- [workflow-playbook.md](./workflow-playbook.md) - Epic workflow and delivery process
- [design-tokens.md](./design-tokens.md) - Design system tokens

⸻

🧠 Overview

Clairity is a desktop-style web platform for optometry and retail teams, designed to feel like macOS running in the browser.
It delivers a multi-window workspace for day-to-day operations such as booking, inventory, and customer management.
Focus: precision, calm UX, and stable engineering.

⸻

⚙️ Core Stack

Layer Tech Notes
Framework Next.js 15.5 (App Router) + React 19.1 SSR + RSC support; Turbopack in dev/build
Language TypeScript 5 (strict) Prettier + ESLint 9 enforced
UI Tailwind CSS v4 + shadcn/ui + lucide-react + framer-motion Motion tokens; macOS glass aesthetic
State Zustand 5 Global slices (desktop, inventory, etc.)
Data Prisma 6.17 (Postgres in prod / SQLite dev) prisma/dev.db for local
Auth / Crypto jose 6, @node-rs/argon2, bcrypt JWT + Argon2-based session auth
Email Resend Transactional + demo notifications
UX / Devices react-rnd (windowing), react-day-picker, @zxing/\* (barcode), tesseract.js (OCR) Supports live scanning + window snapping
Utilities date-fns, zod, tailwind-merge, clsx Shared helpers, validation, and class merging

⸻

🧩 Scripts (CI & Local Gates)

Command Purpose
pnpm run validate Typecheck + ESLint
pnpm build Validate → Prisma generate → Next build (Turbopack)
pnpm seed Seed initial auth data (tsx runner)
pnpm sync-env Push environment variables to remote
pnpm dev Local dev (Turbopack)

All PRs must pass validate + build before merge.

⸻

🗂️ Directory Structure (key areas)

Path Purpose
/src/app Next App Router pages, layout.tsx, global CSS
/src/components Shared UI + desktop/window system
/src/components/windows/ App windows (e.g., BookingCalendar.tsx, LogbookWindow.tsx)
/src/components/scan/IDCardScanner.tsx Barcode + OCR input
/src/store Zustand slices (desktop.ts, calendar.ts, widgets.ts, etc.)
/src/lib Auth, Prisma client, utilities, desktop/workArea, email helpers
/public Icons, backgrounds, employees, manifest assets
/prisma/schema.prisma Data models (Store, Employee, Session)
/src/app/globals.css Core design tokens + Tahoe/macOS utility classes

**Documentation (Docs Module)**
Path Purpose
/src/app/docs/** App Router docs pages per module (Overview, Quickstart, UI guide, API)
/src/components/docs/** Shared docs header, unified layout, sidebar, nav registry
/src/app/api/docs/<module>.json/route.ts Serves OpenAPI JSON used by Swagger UI
/src/lib/docs/<module>OpenAPI.ts OpenAPI object(s) consumed by `/api/docs/<module>.json`
/docs/epics/\*\* Source-of-truth Epics used to generate docs (Epic → Docs pipeline)

⸻

🗃️ Prisma Models (current baseline)

model Store {
id String @id @default(cuid())
email String @unique
password String
totpSecret String?
employees Employee[]
sessions Session[]
createdAt DateTime @default(now())
}

model Employee {
id String @id @default(cuid())
storeId String
store Store @relation(fields: [storeId], references: [id])
name String
slug String
pinHash String
sessions Session[]
createdAt DateTime @default(now())
@@unique([slug, storeId])
}

model Session {
id String @id @default(cuid())
storeId String
store Store @relation(fields: [storeId], references: [id])
employeeId String?
employee Employee? @relation(fields: [employeeId], references: [id])
expiresAt DateTime
createdAt DateTime @default(now())
}

⸻

🌍 Environment Variables

Key Purpose
DATABASE_URL Connection string (Postgres / SQLite)
AUTH_JWT_SECRET JWT signing key
RESEND_API_KEY, RESEND_FROM, EMAIL_ASSET_ORIGIN Email delivery
TOTP_WINDOW Time tolerance for OTP validation
NEXT_TELEMETRY_DISABLED Disable Next telemetry
NEXT_PUBLIC_DEMO_MODE Enable demo-safe environment mode

⸻

🎨 Visual Language & Motion

System identity:
macOS / “Tahoe” aesthetic — layered glass, soft shadows, calm animation.

Core tokens & utilities
• .u-glass, .card-glass-active, .card-glass-inactive
• .ring-focus for keyboard focus
• .win-frame for window shadow + border + chrome
• .u-segment for segmented controls

Motion design
• Easing: cubic-bezier(.2,.8,.2,1)
• Duration: 120–240 ms
• Window open/close: fade + scale
• All animations must respect prefers-reduced-motion

Window system
• Snap overlays, minimize to taskbar, edge zones
• react-rnd used for resizing / dragging
• Stable under reduced-motion and low FPS scenarios

⸻

🧰 Conventions
• UI: Always follow shadcn/ui patterns. No new UI deps without justification.
• Styling: Use Tailwind v4 tokens (globals.css + design-tokens.md)
• Copy: Danish by default — short, calm, clinical tone
• Windows: Keep chrome consistent — titlebar buttons, corner radius, shadows
• Code: All new features must ship via epic plan (see workflow-playbook.md)
• Tests: Manual smoke per window; automated tests added incrementally

⸻

📚 Documentation (Docs Module) — How it works

- **Unified Shell**: All docs pages render inside a shared layout (`UnifiedDocLayout`) with a sticky sidebar and global header.
- **Nav Registry**: Sidebar links are declared centrally in `src/components/docs/nav/index.ts` + presets. Pages must not hardcode their own nav.
- **Epic → Docs Pipeline**: Each docs change is generated from an Epic under `docs/epics/<Module>/…`. Use the IDE reset script to back up & wipe, then a Codex task to scaffold Overview, Quickstart, UI Guide, and API pages from the Epic.
- **Swagger Source of Truth**:
  - Swagger page: `/docs/<module>/api/swagger`
  - Embeds: `/api/docs/swagger?spec=/api/docs/<module>.json`
  - Spec served by: `src/app/api/docs/<module>.json/route.ts`
  - Spec defined in: `src/lib/docs/<module>OpenAPI.ts`
- **Token Guidance**: Use rings for hairlines (e.g., `ring-1 ring-[hsl(var(--line)/.12)]`) instead of hard borders to keep the glass aesthetic consistent.
