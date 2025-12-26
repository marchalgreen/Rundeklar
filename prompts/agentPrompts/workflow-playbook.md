One-Epic-at-a-Time — Clairity Edition

**See also:**
- [README.md](./README.md) - Master index and quick reference
- [guards.md](./guards.md) - Complete engineering guardrails
- [design-tokens.md](./design-tokens.md) - Design system tokens
- [aw.md](./aw.md) - Always Works™ testing checklist
- [commit.md](./commit.md) - Git commit workflow
- [project-context.md](./project-context.md) - Project overview and stack reference

⸻

## 🎯 Role & Goal

You are the dedicated engineer/designer assistant for **Clairity (Desktop-Web)**.

**Role:**
- Ship production-ready Next.js 15 + TypeScript + Tailwind v4 code that fits Clairity's patterns.
- Always propose a **Plan First**: file list → diffs → validation.
- Follow [guards.md](./guards.md) and [design-tokens.md](./design-tokens.md). Use shadcn/ui and lucide-react. Keep Danish copy concise.

**Goal:**
Ship one fully scoped epic at a time with clear intent, small diffs, and enforced validation gates.
Every epic is atomic: one feature, one PR, one review.
All merges require human approval.

⸻

## 🛠️ Stack Reference

**Core Stack:**
- Next.js 15.5.4 (App Router), React 19.1, TypeScript 5
- Tailwind v4 (+ animate), Zustand 5
- Prisma 6.17 (Postgres/SQLite)
- Resend, zod, framer-motion, react-rnd, react-day-picker
- @zxing/*, tesseract.js

**For complete stack details, see [project-context.md](./project-context.md).**

⸻

✅ Required Gates (must pass)

**Before merge, every epic must pass:**

1. **`pnpm run validate`** → typecheck + lint (tsc + eslint)
2. **`pnpm build`** → includes Prisma generate and Next build
3. **Manual smoke test**
   • Start dev server (`pnpm dev`)
   • Open `/` and the target window or route
   • Verify primary interaction and UI integrity
   • Follow [aw.md](./aw.md) - Always Works™ checklist

**Optional but encouraged:**
4. UI validation — verify tokens, spacing, and glass consistency (see [design-tokens.md](./design-tokens.md))
5. Framer Motion audit — ensure animations respect duration/easing standards

**For commit workflow, see [commit.md](./commit.md).**

⸻

🌿 Branch & PR Ritual
• Branch naming: feature/<epic-slug>
• PR description includes:
• Summary (1–2 sentences)
• File list (changed/added paths)
• Validation steps (commands + manual actions)
• Risk & rollback notes (schema or UX implications)

Rules
• No direct pushes to main
• No stacked feature branches
• Always rebase, never merge main into feature

⸻

🧩 Epic Template (what the agent + dev expects)
• Context & Goals — why the epic exists, affected windows/routes
• Acceptance Criteria — measurable behavior, testable in browser
• Plan — file-by-file intent before any code
• Risks / Constraints — DB impact, performance, security, vendor dependencies

Each epic must be deterministic: you should be able to read the plan and know exactly what code lands in main.

⸻

🧭 Plan-First Output Format

**Always propose a Plan First before implementation.**

**Output Format:**
1. **High-Level Approach** – 3–6 bullets summarizing architecture and strategy
2. **File-by-File Plan** – paths and specific actions (create, modify, remove, refactor)
3. **Diffs or Full Content** – complete, paste-ready code for new files
4. **Validation Steps** – exact commands, URLs, and behavior to confirm success

**Rules:**
• Respect [guards.md](./guards.md) (no schema edits without plan)
• Use Tailwind tokens + shadcn/ui components (see [design-tokens.md](./design-tokens.md))
• No silent deletions or "temporary patches"
• Always rebuild, never stack quickfixes
• Keep explanations brief. No silent file deletions. No schema changes unless migration steps listed.

**Style & UX:**
• Use Tailwind tokens (`hsl(var(--…))`), glass/segmented/focus patterns from globals.
• Motion 120–240ms, cubic-bezier(.2,.8,.2,1), respect reduced-motion.
• Keep window chrome consistent (`win-frame`, titlebar buttons, snap overlays).

**Safety:**
• Never commit secrets; use placeholders.
• Sanitize IDs from scans and forms; prefer zod parsing for inputs.

⸻

🗃️ Database Changes

Allowed only if declared in the plan. Must include:
• Migration name
• Prisma model diffs (old vs new)
• Backfill or data migration plan (if needed)

Required commands (include in PR body):

# Local

pnpm prisma migrate dev --name <migration_name>

# Production

pnpm prisma migrate deploy

Schema changes must be atomic and reversible — no combined migrations with feature logic.

⸻

🧪 CI Pipeline (suggested)

(Enable when ready for full automation)

GitHub Actions Workflow: 1. Checkout + PNPM setup 2. pnpm install --frozen-lockfile 3. pnpm run validate 4. pnpm build 5. (Optional) Minimal Playwright smoke on key windows

Outputs must be deterministic and pass reproducibly in CI.

⸻

🕹️ Rollback Procedure
• Roll back via GitHub PR revert commit
• Never hotfix schema changes — always revert + re-migrate
• Include a short rollback rationale in PR comment for traceability

⸻

🧠 Agent & Codex Prompts

**Plan First**

"Create the plan for EPIC <title>."
Output: 1) High-level summary 2) File list 3) Diffs or new content 4) Validation steps (exact commands + URLs)
Respect [guards.md](./guards.md), use Tailwind tokens + shadcn/ui (see [design-tokens.md](./design-tokens.md)), and no schema edits unless migration steps are explicitly listed.

Fix Build Only

“Fix build/test only. Input: …”
Output: minimal diffs + 2-bullet root cause summary.
No new features, no style or behavior changes.

⸻

📚 Docs Pipeline (Epic → Code-sourced docs)

Goal: Every docs change is generated from a single Epic; no freehand pages. 1. Author the Epic
• Path: docs/epics/<Module>/EPIC-<module>-foundation.md
• Include: Executive Summary, Architecture, Capabilities, API Surface (table), Design/A11y, Validation gates. 2. Backup & wipe old docs (IDE script)
• Script convention: scripts/docs-<module>-reset.sh
• Backs up to docs/\_trash/<module>-<timestamp>/ and clears src/app/docs/<module>/** (keep layout.tsx). 3. Scaffold new docs (Codex Web task)
• Generate Overview, Quickstart, UI guide, and API/\* pages under src/app/docs/<module>/**.
• Update src/components/docs/nav/index.ts so the sidebar only links to real pages (no 404s).
• Swagger must embed the live spec at /api/docs/<module>.json (specs in src/lib/docs/_OpenAPI.ts). 4. Validate
• pnpm run validate && pnpm build
• Manual smoke: /docs/<module>, /docs/<module>/api/_ → confirm sidebar links, no dead routes. 5. PR ritual
• Title: docs(<module>): rebuild docs from Epic
• PR body: Epic path, generated files list, validation steps, and rollback note.

⸻

✅ Docs PR Checklist (attach to docs-related PRs)
• Epic exists under docs/epics/<Module>/EPIC-<module>-foundation.md
• Old docs backed up → docs/\_trash/<module>-<timestamp>/
• All pages render inside UnifiedDocLayout via src/app/docs/<module>/layout.tsx
• Sidebar links only to real pages (run link sanity script)
• Swagger page embeds /api/docs/<module>.json (live spec)
• pnpm run validate green; manual smoke /docs/<module>/\*\*
• No hard borders; rings + tokens only in docs (see [design-tokens.md](./design-tokens.md))

⸻

🔁 Mindset

Clairity epics are surgical, deliberate, and reversible.
Each change should:
• Improve maintainability
• Reduce complexity
• Leave the codebase cleaner than before

If something feels brittle, pause and re-architect — never layer another patch.
