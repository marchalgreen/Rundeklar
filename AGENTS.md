# Repository Guidelines

## Project Structure & Module Organization
- The repo is moving to a pnpm monorepo. Workspace packages are under `packages/`.
  - `packages/web/` hosts the Next.js desktop application (former repo root). Application code lives under `packages/web/app`, shared UI in `packages/web/components`, domain utilities in `packages/web/lib`, and client stores in `packages/web/store`.
  - `packages/device-agent/` is a scaffold for the local ingest companion service; implementation is in discovery.
- API, UI, and normalization suites stay rooted in `tests/`; Playwright e2e specs now live under `packages/web/tests/e2e` while the device agent scaffolding matures.
- Prisma schema and migrations were moved into `packages/web/prisma`. Run schema changes through migrations rather than editing the database directly.
- Shared scripts continue to live in `/scripts`, reusable assets in `/public`, prompts in `/prompts/agentPrompts`, and docs/epics remain the product source of truth.

## Build, Test, and Development Commands
- `pnpm install` – install workspace dependencies (creates per-package `node_modules` symlinks).
- `pnpm dev` – launch the Next.js app via `@clairity/web` using Turbopack.
- `pnpm build` – run linting, type-checking, Prisma generation, and a production build for the web app.
- `pnpm validate` – quick CI parity check (TypeScript + ESLint) before pushing.
- `pnpm exec playwright test` or `pnpm test:e2e:web` – execute Playwright specs; use `--project` filters (e.g., `--project=web`) for package-scoped runs.

## Coding Style & Naming Conventions
- Follow the repo’s ESLint and Prettier configs (`eslint.config.mjs`, `prettier.config.js`); code is formatted with two-space indentation and semicolons off.
- Prefer functional React components with PascalCase filenames (`InventoryGrid.tsx`), colocating component-specific styles or hooks alongside the component.
- Use explicit TypeScript exports and shared types from `src/types` or `lib` to avoid duplicate definitions; leverage Tailwind utility classes defined in `tailwind.config.ts`.

## Testing Guidelines
- UI and workflow coverage relies on Playwright; name specs after the feature under test (e.g., `inventory-onboarding.spec.ts`).
- API and normalization checks live under `tests/api` and `tests/normalization`; seed data via `pnpm seed` when deterministic fixtures are required.
- Ensure new features include at least one automated check and document any manual verification steps in the pull request.

## Commit & Pull Request Guidelines
- Before crafting a commit, review `prompts/agentPrompts/commit.md` and mirror its template so every message captures scope, rationale, and validation steps.
- Keep commit subjects concise (<72 chars) and use conventional prefixes (`fix:`, `feat:`, `chore(scope):`, etc.) that match the guidance in the prompt file.
- Each PR should describe the user-facing outcome, list validation steps or screenshots for UI changes, and link relevant Linear/GitHub issues.
- Request review once `pnpm validate` and targeted Playwright suites pass locally; note any skipped tests or follow-up tasks in the PR body.
- **For complete guardrails and workflows, see [`prompts/agentPrompts/README.md`](prompts/agentPrompts/README.md).**

## Environment & Data
- Copy `.env.example` to `.env.local` and update secrets; sync shared variables with `pnpm sync-env` when rotating credentials.
- Run `pnpm prisma migrate dev` to apply schema changes locally; production deploys rely on `prisma migrate deploy` invoked during CI.

## Agent Reference Prompts

**Start here:** [`prompts/agentPrompts/README.md`](prompts/agentPrompts/README.md) – Master index with quick reference to all guardrails and workflows.

### Core Guardrails & Workflows
- `prompts/agentPrompts/README.md` – **Master index** with quick reference and navigation guide for all guardrails.
- `prompts/agentPrompts/guards.md` – Complete engineering guardrails covering architecture, styling, docs, database, and accessibility.
- `prompts/agentPrompts/workflow-playbook.md` – Expected delivery cadence, QA checklist, and review flow for collaborators (includes Plan-First workflow).
- `prompts/agentPrompts/design-tokens.md` – Canonical naming and usage of design tokens when styling components.
- `prompts/agentPrompts/aw.md` – Always Works™ testing checklist to confirm changes are validated end-to-end.
- `prompts/agentPrompts/commit.md` – Intelligent commit workflow guardrails and conventional commit expectations.

### Reference Documentation
- `prompts/agentPrompts/project-context.md` – Overview of product goals and current focus areas to ground new work.
- `prompts/agentPrompts/ConversationStarter.md` – Canned prompts to kick off plan-first work, build fixes, and docs regeneration.

### Other Prompts
- `prompts/starterprompt.md` – Long-form onboarding with stack details and the Booking Kalender epic reference.
- `prompts/tree.md` – Command for regenerating the repo tree snapshot (`__project-tree.txt`).
- `prompts/commands.md` – Quick reminder to run `npx tsc --noEmit` when you need every TypeScript error.

### Deprecated
- `prompts/agentPrompts/PastethisintheInstructionsbox.md` – ⚠️ **DEPRECATED** – Content has been consolidated into `workflow-playbook.md`.
