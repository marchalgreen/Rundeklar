Coach Landing Page — Integration Notes

Mounting
- Mount `packages/webapp/src/routes/LandingPage.tsx` where the current “Indtjekning start training/landing page” lives.
- Pass an optional `coach` prop when coach-login exists: `{ id, displayName? }`.
- If `coach` is not provided, `coachAdapter` supplies `DEFAULT_COACH_ID` (env: `VITE_DEFAULT_COACH_ID`).

Adapter and Endpoints
- The landing module calls a thin service adapter (`src/services/coachLandingApi.ts`) that maps to the existing app API:
  - GET groups → derived from players.trainingGroup
  - GET active session → `api.session.getActive()` (coach dimension ignored for now)
  - POST start session → `api.session.startOrGetActive()` and persists a small handoff seed in `localStorage`.
- If server endpoints later exist (`/api/training-groups`, `/api/players`, `/api/sessions/*`), swap the service adapter implementation. The landing UI code stays intact.

Handoff to CheckIn
- On successful start, `LandingPage` invokes `onRedirectToCheckin(sessionId)`; the host route should navigate to the existing CheckIn view.
- The adapter persists `{ groupId, extraPlayerIds }` under `coach-landing:pending-session-seed` for the CheckIn page to optionally read and pre-filter or pre-check-in players. This keeps coupling minimal until full auth + server integration.

Timezone
- ISO timestamps are sent in UTC via `new Date().toISOString()`.
- Display uses app-wide formatters (Europe/Copenhagen via constants).

Analytics
- Emits console-debug stubs: `landing_groups_loaded`, `group_selected`, `search_opened`, `player_selected_from_search`, `session_start_*` for easy future wiring.

Migration to Multi-Coach
- Only update `src/lib/coachAdapter.ts` to return the logged-in coach id; keep the same public shape.
- Optionally extend the service adapter to include coach-aware active session queries and group scoping.

