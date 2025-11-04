🧱 Clairity Guardrails

These guardrails define the non-negotiable engineering constraints for the Clairity Desktop-Web codebase.
They ensure maintainability, data safety, and design consistency across all epics.

⸻

🧩 Architecture & File Structure
• Never move files across domains (components/, store/, lib/, etc.) without stating why in the epic plan.
• New UI components:
• Shared UI → src/components/
• Windows → src/components/windows/
• Never delete or rename files silently. All removals or renames must be called out in the plan or PR summary.
• Prefer composition over duplication. If multiple windows share logic, extract to /lib or a shared hook.

⸻

🎨 Styling & Design System
• Use Tailwind v4 tokens (see design-tokens.md and tailwind.config.ts).
• No hard-coded hex values. Use tokens or semantic Tailwind utilities.
• Use shadcn/ui primitives and lucide-react icons for all new UI.
• No new UI libraries or design systems unless explicitly justified and approved in the epic plan.
• Respect macOS/Tahoe visual identity — radius, shadows, glass, focus rings.
• Hairlines use rings, not borders:
• ✅ `ring-1 ring-[hsl(var(--line)/.12)]`
• ❌ `border-[hsl(var(--line))]`

⸻

🧾 Docs & Documentation System
• All docs pages must render inside the unified layout (`UnifiedDocLayout`) via a section-level `layout.tsx`.
• Sidebar navigation is driven by `src/components/docs/nav/index.ts` and presets — never hardcoded per page.
• Each docs change originates from a single **Epic** (`docs/epics/<Module>/EPIC-<module>.md`).
• When regenerating docs:
• Backup → `docs/_trash/<module>-<timestamp>/`
• Clear → `src/app/docs/<module>/**` (keep layout.tsx)
• Scaffold → Overview, Quickstart, UI Guide, API pages via Codex task.
• Swagger pages must always embed live specs:
• `/docs/<module>/api/swagger` → `/api/docs/swagger?spec=/api/docs/<module>.json`
• Specs live under `src/lib/docs/*OpenAPI.ts` and are served by `/api/docs/<module>.json`.
• No guessed endpoints or manual Swagger HTML.
• Sidebar links may never point to non-existent pages. Remove or add placeholders instead of leaving 404s.
• All docs use Tailwind tokens — rings, surfaces, and HSL vars. No hex or raw borders.
• All docs PRs must include validation:

1. `pnpm run validate`
2. Manual smoke on `/docs/<module>` routes (sidebar + pages)
3. Swagger embed renders successfully.

⸻

🗃️ Database / Prisma
• No schema or model edits unless explicitly defined in the plan.
Each DB-touching epic must include:
• Migration name
• Model diffs (old vs new)
• Data migration or backfill strategy
• Commands for local and production runs
• Commands must be included in the PR body:

pnpm prisma migrate dev --name <name>
pnpm prisma migrate deploy

• Never commit secrets, connection strings, or real URLs.
• .env keys must remain documented but values must be safe placeholders.

⸻

🧪 Build & Quality Gates
• All PRs must pass: 1. pnpm run validate → typecheck + lint 2. pnpm build → includes Prisma generate and Next build
• Maintain path-safe imports. No circular dependencies.
• Respect TypeScript strict mode.
• No any unless wrapped in a typed alias with a // TODO: refine note.
• Ensure new files pass Prettier and ESLint automatically.

⸻

♿ Accessibility & Localization
• Maintain logical focus order and visible focus rings.
• All interactive elements must be keyboard-navigable.
• Default copy language: Danish (da-DK).
• Keep labels short, clear, and clinical in tone.
• If adding new text, ensure it’s ready for localization (no hardcoded inline text in logic).

⸻

⚡ Performance
• Avoid blocking hydration with expensive sync logic.
• Lazy-load heavy components or data when possible.
• Limit Framer Motion use to short, low-impact transitions.
• Respect prefers-reduced-motion.
• Defer analytics or non-critical network requests until post-mount.

⸻

🪟 Windowing & Desktop Behavior
• Never break or bypass Window component behavior:
• Snap zones
• Minimize animations
• Titlebar buttons
• Window focus/blur states
• Do not mutate the global desktop Zustand shape without prior approval.
• Follow useDesktop() conventions for opening, focusing, and minimizing windows.
• Keep window chrome consistent across all windowed experiences.

⸻

🔒 Security & Data Integrity
• Never log secrets or personally identifiable information (PII).
• Always sanitize external or user-generated input using zod schemas.
• When handling IDs (e.g., scanned barcodes), validate format and sanitize before storage or lookup.
• Avoid leaking internal identifiers to client logs or external APIs.
• All fetches to vendor or network APIs must include error handling and safe fallbacks.

⸻

🧠 Principle

Clairity code is surgical, auditable, and reversible.
If a change can’t be cleanly rolled back, it’s too large for a single epic.
