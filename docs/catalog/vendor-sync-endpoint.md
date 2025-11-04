# Generic Vendor Sync Endpoint

## Overview

The `/api/catalog/vendor-sync/:slug/sync` endpoint provides a unified entry point
for triggering catalog synchronisation across vendors. It replaces the legacy
`/api/catalog/moscot/sync` route and adds support for pluggable vendor
integrations while preserving backwards-compatible MOSCOT behaviour.

## Authentication

The endpoint requires a valid service JWT (see [`requireServiceJwt`](../../packages/web/src/lib/auth/serviceToken.ts)).
The caller must include the `catalog:sync:write` scope or the request will be
rejected with `403 insufficient_scope`.

## Request

```
POST /api/catalog/vendor-sync/{slug}/sync
Authorization: Bearer <service token>
Content-Type: application/json

{
  "mode": "dryRun" | "apply",   // optional; defaults to dryRun
  "dryRun": boolean,             // optional; legacy flag (body wins over query)
  "sourcePath": string,          // optional path override for scraper integrations
  "inject": [ { ... } ]          // optional array of catalog rows (testing)
}
```

`mode` can also be supplied via `?mode=apply` or `?mode=dryRun`. Legacy
`?dryRun=` query parameters (accepting `0/1` or boolean strings) remain
supported and are normalised into the same mode contract.

If no mode is provided the endpoint defaults to a dry-run execution for safety.

## Response

On success the endpoint returns run metadata and the sync summary:

```
{
  "ok": true,
  "mode": "dryRun" | "apply",
  "runId": "run_test" | null,
  "summary": {
    "vendor": "moscot",
    "sourcePath": "(resolved path)",
    "total": 42,
    "created": 10,
    "updated": 5,
    "unchanged": 25,
    "removed": 2,
    "hash": "…",
    "dryRun": true,
    "durationMs": 1234,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "status": "Success" | "Pending" | "Failed" | null
  }
}
```

Error responses include `{ ok: false, error, detail }` with appropriate HTTP
status codes:

| Status | Error Code                   | Notes                                   |
|--------|------------------------------|-----------------------------------------|
| 400    | `missing_vendor_slug`        | slug missing from route params          |
| 400    | `invalid_request`            | body/query failed schema validation     |
| 401    | `missing_token` / `invalid_token` | service JWT missing or invalid     |
| 403    | `insufficient_scope`         | token missing `catalog:sync:write`      |
| 404    | `vendor_not_configured`      | registry has no configured integration  |
| 501    | `integration_not_supported`  | integration type not yet implemented    |
| 500    | `error`                      | unexpected server error                 |

## Dispatching

The endpoint uses `dispatchVendorSync` to route a request to the appropriate
integration. See [`vendorSyncDispatcher.ts`](../../packages/web/src/lib/catalog/vendorSyncDispatcher.ts)
for the dispatcher logic and [`vendorSyncSchemas.ts`](../../packages/web/src/lib/catalog/vendorSyncSchemas.ts)
for request/response schema helpers.
