EPIC: Monorepo Foundation v0.2

Purpose
- Evolve Clairity into a pnpm monorepo so the desktop web app, local device agent, and future shared libraries can iterate together with shared tooling, types, and CI.
- Unblock the Local Device Ingest Bridge by giving the device companion a first-class workspace home while keeping the web app stable.

Status
- Owner: Platform / Tooling
- Start: 2025-10-29
- Phase: Execution (Web package migration complete; follow-up tasks tracked below)
- Target: Land a stable workspace layout ahead of the local device ingest MVP.

Outcomes
- Introduce `packages/` workspace with `@clairity/web` (existing Next.js app) and a scaffolded `@clairity/device-agent`.
- Preserve existing developer workflows (`pnpm dev`, `pnpm validate`, E2E suites) with minimal command churn.
- Centralize shared configuration (TypeScript base config, ESLint, Prisma CLI) at the repo root.
- Document the migration plan, progress, and next actions for collaborators.

Scope & Plan
1. **Workspace bootstrap** ✅
   - Add root `package.json`, `pnpm-workspace.yaml`, and `tsconfig.base.json`.
   - Move the Next.js app and Prisma assets into `packages/web`.
   - Scaffold `packages/device-agent` with initial scripts and documentation stub.
2. **Tooling alignment** ✅
   - Update lint/typecheck/test scripts to use workspace filters.
   - Ensure Playwright, Prisma, and shared scripts resolve paths correctly after the move.
3. **Documentation refresh** ✅
   - Update AGENTS.md and README.md to reflect the monorepo structure (completed in this iteration).
   - Publish this epic to track remaining tasks and onboarding guidance (current deliverable).
4. **Test & CI updates** ⏳
   - Playwright E2E suite migrated to `packages/web/tests/e2e`; API/UI/normalization checks remain at root pending tooling updates.
   - Update CI pipelines to call workspace-aware scripts.
5. **Shared package extraction** ⏳
   - Identify cross-cutting utilities (protocol types, env helpers) for future packages.
6. **Device agent implementation** ⏳
   - Fill out `@clairity/device-agent` with serial/file ingest code, packaging, and auto-update logic as discovery completes.

Current Progress
- ✅ `@clairity/web` established with historical source, Prisma schema, and build scripts.
- ✅ Root workspace orchestrates builds/tests via `pnpm --filter`.
- ✅ Placeholder `@clairity/device-agent` package with README + entry point.
- ✅ Root documentation refreshed (README, AGENTS) to describe the new topology and Playwright move.
- ✅ Web Playwright suite executes from `packages/web/tests/e2e` with project-based config; shared fixtures follow the package.
- ⚠️ API/UI/normalization suites still sit at root; migrate once supporting tooling is ready.
- ⚠️ CI/scripts still need small cleanups (e.g., referencing filtered commands explicitly).

Next Decisions
1. Plan relocation of remaining root `tests/*` directories (API/UI/normalization) into package-scoped homes without breaking runners.
2. Define CI pipeline updates (workspace-aware lint/typecheck/test) and confirm caching strategy.
3. Kick off shared protocol/types package once the ingest agent solidifies the wire format.
4. Flesh out device-agent build process (bundling, auto-update) and align with Local Device Ingest epic milestones.

Validation
- `pnpm validate` (typecheck + lint) passes from the workspace root.
- `pnpm dev` launches the Next.js app using the filtered workspace command.
- `pnpm test:e2e:web` (or `pnpm exec playwright test --project=web`) discovers the packaged Playwright suite; other root tests remain functional.

Notes
- Keep `.env.local` accessible to both the root and `packages/web` (symlink recommended) until env management is centralized.
- Avoid deleting root-level assets/scripts until their ownership is re-evaluated inside packages.
