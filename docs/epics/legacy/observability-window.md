📄 File: docs/observability-window.md (paste-ready)

# Observability Window (v1.1)

The **Vendor Sync Observability** window provides operators with a filterable, paginated view of vendor sync executions and surfacing of errors, runtime, counts, and the latest snapshot for a vendor.

- **Route:** `/vendor-sync`
- **Vendors:** initial support for `MOSCOT`
- **State:** run history persisted via `VendorSyncRun`, last-run snapshot in `VendorSyncState`
- **Status:** `Success`, `Failed`, `Pending/Running` (normalized to UI: success/error/running)

---

## UI Overview

- **Filters**

  - Date: `7/30/90/All` or explicit `Fra / Til`
  - Status: `Success / Failed / Running` (multi-select)
  - Vendor: `MOSCOT` (default)

- **Stats**

  - `Kørsler i vinduet` (window total)
  - `Succes`, `Fejl`, `I gang` counts
  - `Seneste kørsel` (timestamp)

- **Table**

  - Columns: `Startet`, `Varighed`, `Status`, `Dry-run`, `Bruger`, `Kilde`, `Hash`
  - Pagination: `Prev / Next` (cursor-based)

- **Detail Drawer**
  - Counts, duration, actor, source, hash, error (if failed)

---

## Endpoints

Read (public in dev; **recommend protected in prod**):

- `GET /api/catalog/vendor-sync/state?vendor=<ID>`  
  Returns `{ ok: true, snapshot: {...} | null }`.

- `GET /api/catalog/vendor-sync/runs?vendor=<ID>&status=<s>&limit=<n>&cursor=<id>`  
  Returns `{ ok: true, data: { items: [...], page, pageSize, totalItems, hasMore, nextCursor } }`.

- `GET /api/catalog/vendor-sync/observability?vendorId=<ID>&start=<ISO>&end=<ISO>&status=<s>&limit=<n>&cursor=<id>`  
  Returns combined `{ items, aggregates: { totalRuns, latestRunAt, pageSize }, nextCursor }`.

Write (service-to-service):

- `POST /api/catalog/moscot/sync`  
  Headers: `Authorization: Bearer <service token>`  
  Scopes: `catalog:sync:write` (or `catalog:sync:moscot`)  
  Body: `{ "dryRun": true|false, "sourcePath": "/abs/path.json" }`

---

## Data Models (Prisma)

- **`VendorSyncRun`**  
  `id`, `vendor`, `actor`, `status(Pending|Success|Failed)`, `dryRun`, `sourcePath`, `hash`, `error`,  
  counts (`totalItems`, `createdCount`, `updatedCount`, `unchangedCount`, `removedCount`),  
  `startedAt`, `finishedAt`, `durationMs`

- **`VendorSyncState`** (snapshot)  
  `vendor`, `lastHash`, `lastSource`, `lastRunAt`, `lastRunBy`, `totalItems`, `lastDurationMs`, `lastError`

---

## Auth & Secrets

- Read routes are open in dev; for prod add at the start of handlers:

  ```ts
  if (process.env.NODE_ENV === 'production') {
    await requireServiceJwt(req, { scope: 'catalog:sync:read' });
  }

  •	Service JWTs:
  •	SERVICE_JWT_SECRET (HS256 shared secret)
  •	SERVICE_JWT_AUDIENCE (default clairity-services)
  •	Script: pnpm tsx scripts/mint-service-token.ts read|write [ttlSec]
  ```

⸻

File Map

/src/components/vendor-sync/ObservabilityWindow.tsx # Window composite
/src/components/observability/RunFilters.tsx # Vendor/date/status filters
/src/components/observability/RunTable.tsx # Paginated run table
/src/components/observability/RunDetailDrawer.tsx # Drawer w/ details
/src/hooks/useVendorSyncObservability.ts # Aggregates + items + cursor
/src/hooks/useVendorSyncRuns.ts # Legacy/fallback runs
/src/lib/catalog/moscotSync.ts # Sync job w/ run-history + snapshot
/src/app/api/catalog/vendor-sync/observability/route.ts
/src/app/api/catalog/vendor-sync/runs/route.ts
/src/app/api/catalog/vendor-sync/state/route.ts

⸻

Local Validation

Quick smoke (UI) 1. Run: pnpm dev → open /vendor-sync 2. Change date/status filters → list updates 3. Click a row → drawer shows counts + error (if present) 4. Run a dry/apply sync, then Opdater to see new runs

Curl (read)

READ_TOKEN="$(pnpm -s tsx scripts/mint-service-token.ts read)"

curl -sS -H "Authorization: Bearer $READ_TOKEN" \
 "http://localhost:3000/api/catalog/vendor-sync/state?vendor=MOSCOT" | jq

curl -sS -H "Authorization: Bearer $READ_TOKEN" \
 "http://localhost:3000/api/catalog/vendor-sync/runs?vendor=MOSCOT&limit=5" | jq

Curl (write)

WRITE_TOKEN="$(pnpm -s tsx scripts/mint-service-token.ts write)"

# Dry run

curl -sS -X POST -H "Authorization: Bearer $WRITE_TOKEN" -H "Content-Type: application/json" \
 -d '{"dryRun":true}' "http://localhost:3000/api/catalog/moscot/sync" | jq

# Apply

curl -sS -X POST -H "Authorization: Bearer $WRITE_TOKEN" -H "Content-Type: application/json" \
 -d '{"dryRun":false}' "http://localhost:3000/api/catalog/moscot/sync" | jq

⸻

E2E Coverage (Playwright)
• Install once: pnpm exec playwright install
• Run headless: pnpm exec playwright test
• Visual: pnpm exec playwright test --ui

Notes:
• Tests mint auth via GET /api/auth/dev-mint (same-origin cookie).
• Routes are stubbed with fixtures for deterministic UI.
• Spec: packages/web/tests/e2e/vendor-sync-observability.spec.ts

⸻

Troubleshooting
• Login page appears in E2E → ensure GET /api/auth/dev-mint exists (dev only) and middleware marks it PUBLIC.
• invalid_token → mint & server must share SERVICE_JWT_SECRET; keep default audience clairity-services.
• P2028 timeout on apply sync → batched createMany + extended transaction timeout is implemented; bump in moscotSync.ts if dataset grows.
• Stats mismatch → the window aggregates from /observability; ensure date/status filters match your expectations.

⸻

Roadmap
• Scheduler v1.2: automated daily/hourly sync jobs, retry/backoff, health logging
• Multi-vendor registry & window vendor switch
• Alerts/notifications surface for failed runs

---

## README additions (link the doc)

Add under your README “Key Features” or at the bottom:

```md
### Docs

- [Observability Window (v1.1)](docs/observability-window.md)
- [Inventory Module](docs/inventory-module.md) <!-- (existing/internal) -->

⸻

VS Code Codex command to apply the doc (optional)

Paste in your Codex sidebar:

/implement docs observability window --smart --include-docs --validate

Prompt body:

Create a new file `docs/observability-window.md` with the content below (verbatim). Do not change code files. Then run typecheck/lint to ensure CI stays green.
```
