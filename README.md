# Rundeklar – Webapp

En webapplikation til den lokale badmintonklub. Applikationen bruger Postgres database (Vercel Neon) via Vercel API routes til data persistence.

## Funktioner
- **Spilleradministration** med søgning, CRUD og aktiv/inaktiv-toggle
- **Check ind**-skærm i kiosk-stil med virtuel liste og hurtig feedback
- **Kampprogram** med start/stop af træning, bænkliste, auto-match på 8 baner, drag & drop og manuelle flytninger
- Auto-seed af 40 demo-spillere og 8 baner for hurtig demo

## Tech Stack
- Vite + React 19 + TypeScript + Tailwind CSS
- Postgres database (Vercel Neon) via Vercel API routes
- Multi-tenant architecture med tenant isolation
- Zod til inputvalidering
- Delt typer i `packages/common`

## Kom godt i gang
### Krav
- Node.js ≥ 20
- pnpm ≥ 9
- Vercel CLI (for lokal udvikling med API routes)
- Postgres database (Vercel Neon anbefalet)

### Installation
```bash
pnpm install
```

### Udvikling

For lokal udvikling kører `pnpm dev` automatisk både Vite dev server og API serveren samtidigt via `concurrently`:

```bash
pnpm dev
```

Dette starter:
- **Vite dev server** på `http://127.0.0.1:5173` (frontend)
- **API server** på `http://127.0.0.1:3000` (backend/database proxy)

Begge servere kører i samme terminal med farvekodet output (`[vite]` og `[api]`).

**Vigtigt:** Hvis du ser `net::ERR_CONNECTION_REFUSED` fejl i browserens konsol, betyder det sandsynligvis, at:
- API serveren crashede ved startup (tjek terminal output for fejl)
- Port 3000 er allerede i brug af en anden proces
- Der mangler miljøvariabler i `.env.local` (f.eks. `DATABASE_URL`)

**Alternativ:** Hvis du foretrækker at køre servere separat, kan du bruge:
```bash
# Terminal 1: Kun Vite
pnpm --filter webapp dev:vite

# Terminal 2: Kun API server
pnpm --filter webapp dev:api
```

**Miljøvariabler:**
- Opret `.env.local` i `packages/webapp/` med `DATABASE_URL` (Postgres connection string)
- Se `.env.example` for eksempel konfiguration

### Produktion
```bash
pnpm build
```
Bygger `packages/common` og webappen (output i `packages/webapp/dist`).

### Test
```bash
pnpm test
```
Kører Vitest-tests for matchmaker-logikken.

## Manuel smoke-test
1. `pnpm dev` og åbn http://127.0.0.1:5173.
2. Gå til **Spillere**: opret/ret en spiller og toggl aktiv-status.
3. Skift til **Kampprogram** og tryk “Start træning”.
4. I **Check ind**: søg efter spillere og tryk “Check ind”.
5. Tilbage i **Kampprogram**: brug “Auto-match”, træk spillere mellem bænken og banerne, og afprøv “Nulstil kampe”.
6. Afslut træningen og bekræft at **Check ind**-skærmen viser “Ingen aktiv træning”.

## Projektstruktur
```
packages/
  common/   → delte TypeScript-typer
  webapp/   → Vite + React-klient, Postgres API, matcher mv.
    api/    → Vercel serverless functions (database proxy)
    src/    → React applikation
```

## Database Setup

Applikationen bruger Postgres database (Vercel Neon anbefalet) via Vercel API routes.

### Database Schema
- Anvend migrations fra `database/migrations/` på din Postgres database
- Schema understøtter multi-tenant architecture med tenant isolation

### Tenant Configuration
- Tenant configs findes i `packages/webapp/src/config/tenants/`
- Hver tenant har sin egen konfiguration med database connection string

## Noter
- Matchmaker-logikken er isoleret i `packages/webapp/src/lib/matchmaker.ts` og dækket af Vitest.
- Alle database queries går gennem Vercel API routes (`api/db.ts`) for sikkerhed og tenant isolation.

## Engineering Guidelines Index (source of truth & precedence)

When guidelines conflict, use this precedence order and refer to the canonical source for each topic:

1. Non‑negotiable guardrails (canonical)
   - `prompts/agentPrompts/guards.md`
2. Architecture (application‑wide patterns)
   - `packages/webapp/ARCHITECTURE.md`
3. Code organization and patterns
   - `packages/webapp/CODE_ORGANIZATION_GUIDE.md`
4. Responsive design (canonical for responsiveness)
   - `packages/webapp/RESPONSIVE_DESIGN_GUIDE.md`
5. Delivery checklist (build/run/verify)
   - `packages/webapp/AlwaysWorks.md`
6. Feature‑specific docs and plans
   - e.g., `packages/webapp/RESPONSIVE_REFACTORING_PLAN.md`, specs under `packages/webapp/tests/`

Notes:
- Do not duplicate rules across documents. Summarize locally and link to the canonical doc.
- If a local doc and a canonical doc disagree, the canonical doc wins (per the order above).
