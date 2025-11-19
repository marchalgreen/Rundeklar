---
description: Ensure what you implement Always Works™ in the Herlev Hjorten webapp
---

# How to ensure **Always Works™** implementation

Note on precedence: For guardrails, see `prompts/agentPrompts/guards.md`. This checklist complements, and does not override, the canonical guardrails or the `RESPONSIVE_DESIGN_GUIDE.md`.

Please ensure your implementation Always Works™ for: **$ARGUMENTS**  
_(e.g. “Check-in flow”, “Match auto-arrange”, “Player CRUD”, “Statistics aggregation”, etc.)_

Follow this systematic approach.

---

## Core Philosophy

- **“Should work” ≠ “does work.”** Pattern matching isn’t delivery; only _run, observed, verified_ code is done.
- **We’re paid to solve problems, not to ship guesses.** A merged PR _without_ proof is not a solution.
- **Untested code is a guess.** A 30-second smoke test now saves 30+ minutes of firefighting later.
- **No background promises.** Don’t say “I’ll test later” or “hold on.” Either deliver a working change with proof, or provide an actionable next-step plan (commands + expected output).

---

## The 30-Second Reality Check (must answer **YES** to all)

- [ ] **Built it:** `pnpm build` is green, `pnpm lint` passes, and `pnpm test` is green.
- [ ] **Ran it:** `pnpm dev` is running (Vite on :5173; preview on :4173).
- [ ] **Triggered it:** I exercised the exact UI/route/config I changed (clicked the button / hit the endpoint / restarted the server).
- [ ] **Observed it:** I saw the expected UI or `curl`/log output with my own eyes and pasted a snippet in the PR.
- [ ] **Error paths:** I forced at least one failure case and saw a clear, actionable error (e.g. validation toast, disabled action, or logged AppError).
- [ ] **Config holds:** Tenant config from `src/config/tenants/*.json` is loaded/applied (branding, courts count, categories) and survives reload.
- [ ] **I’d bet €100 this works.**
 - [ ] **Documented it:** All exported functions/classes/components updated with JSDoc; module README added/updated if introducing a new module.

---

## Phrases to Avoid

- ❌ “This **should** work now.” → ✅ “I built, ran, and verified. Here’s the output: …”
- ❌ “I’ve fixed it” (esp. 2nd+ time) → ✅ “Root cause was X; fixed with Y; smoke shows Z (logs below).”
- ❌ “Try it now” (without testing) → ✅ “I tried exactly these steps locally; here’s the success log/screenshot.”
- ❌ “The logic is correct so…” → ✅ “I executed the specific scenario; behavior matches acceptance criteria.”

---

## Specific Test Requirements

- **UI changes:** Start the app, navigate to the affected route, click the control, and observe DOM/state:
  - `CheckIn`: add players, check in/out, verify letter filters and counts.
  - `MatchProgram`: auto-arrange or manual move; verify assignments and leftover bench.
  - `PlayersDB`: create/edit/delete player; validate partner edit and form validation.
  - `Statistics`: confirm totals update after actions.
- **Responsive checks (required for UI changes):**
  - [ ] Mobile 375px (iPhone SE): no horizontal overflow, readable text, tappable buttons (≥44px).
  - [ ] Tablet 768px (iPad portrait): layouts adapt (grids/stacking), comfortable spacing.
  - [ ] Tablet 1024px (iPad landscape): multi-column layouts and headers align.
  - [ ] Desktop 1280px+: optimal spacing, no fixed-width overflow.
  - [ ] Uses mobile-first classes with responsive modifiers (`sm:`, `md:`, `lg:`).
  - See `RESPONSIVE_DESIGN_GUIDE.md` for full patterns and the pre-commit checklist.
 - **Documentation checks (required for all changes):**
   - [ ] JSDoc present on all new or modified exported functions/classes/components/hooks/services.
   - [ ] Hook docs describe inputs, return shape, side effects, and error handling.
   - [ ] API docs describe request/response shapes and error cases.
   - [ ] Module README added/updated when introducing or significantly changing a module.
- **Logic changes:** Run unit tests (`pnpm test`). Add/extend tests under `packages/webapp/tests/` (e.g., `matchmaker.test.ts`) for new edge cases. Reproduce the scenario end-to-end in the UI.
- **Data/Neon changes:** Ensure `.env.local` is configured and the SQL migration is applied. Verify changes in Neon SQL Editor after UI actions.
- **Config changes:** Modify `src/config/tenants/*.json`, restart dev server, and verify branding/court settings are reflected. Rebuild to ensure configs are copied to `dist/`.

---

## Project Cheatsheet (Herlev Hjorten)

> All commands assume repo root. Root scripts already filter to the webapp.

### Build & Run

pnpm build
pnpm dev           # Vite dev server on http://127.0.0.1:5173
pnpm preview       # Preview build on http://127.0.0.1:4173

Quality

pnpm lint
pnpm test          # Vitest

Neon Database (data)

See `docs/VERCEL_NEON_SETUP.md` for full setup. Essentials:

- Create `packages/webapp/.env.local` with:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

- Apply initial schema via Neon SQL Editor using `database/migrations/001_initial_schema.sql` (recommended).

Optional seed helpers (run from repo root):

pnpm --filter @herlev-hjorten/webapp exec tsx scripts/seed-courts.ts
pnpm --filter @herlev-hjorten/webapp exec tsx scripts/seed-demo-data.ts

⸻

Quick Functional Smokes (copy/paste & adapt)

Replace player names, categories, and courts as needed. Perform these in a single dev session.

Check-in

1) Open Check-in route.
2) Add 2–3 players (use distinct initials).
3) Toggle check-in/out and verify counts and letter filters.

Match Program

1) Ensure some players are checked in.
2) Auto-arrange or manually place players onto courts.
3) Verify assignments fill 4 per court; leftovers remain on bench.

Players DB

1) Create a player; verify validation for missing/invalid fields.
2) Edit a player’s partner and level; confirm persistence.
3) Delete or deactivate and confirm it no longer appears in searches.

Statistics

1) Open Statistics; confirm totals match Check-in/Players DB actions.

Error paths to try (pick at least one)

- Submit an empty/invalid player form and verify field errors or a toast.
- Attempt to arrange with fewer than 4 players and confirm graceful handling.
- Disconnect/revoke Neon database and verify a clear error message is shown/logged.

⸻

The Embarrassment Test

If the user screen-records themselves following my steps and it fails, will I be embarrassed watching it back?
If yes, the change isn’t “Always Works™” yet. Keep testing until you’d confidently demo it live.

⸻

Time Reality
• Skipping validation saves ~30 seconds now, costs ~30 minutes later.
• Running a concise smoke takes ~30 seconds and buys trust.
• A user describing the same bug a third time doesn’t think “they’re trying hard”—they think “why am I doing QA?”
