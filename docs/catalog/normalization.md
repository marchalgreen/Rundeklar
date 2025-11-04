# Vendor catalog normalization

This document outlines the foundations for Clairity's vendor catalog normalization layer. The goal is to convert vendor-specific payloads into a consistent `NormalizedProduct` structure that downstream services can consume.

## NormalizedProduct schema

Normalized product types live in [`packages/web/src/lib/catalog/normalizationSchemas.ts`](../../packages/web/src/lib/catalog/normalizationSchemas.ts) with corresponding TypeScript helpers in [`packages/web/src/lib/catalog/normalization/types.ts`](../../packages/web/src/lib/catalog/normalization/types.ts).

Key properties:

- `vendor`: slug + friendly name for the source vendor.
- `catalogId`: stable identifier from the vendor.
- `category`: one of `Frames | Lenses | Contacts | Accessories`. Variant types must align with the category.
- `photos`, `price`, and `source`: normalized metadata for PDP rendering and auditing.
- `variants`: discriminated union covering frames, lenses, contacts, and accessories. Every product carries at least one variant, even when the vendor payload omits variant rows.
- `extras`: optional bag for adapter-specific metadata. The original payload is always preserved under `raw` for debugging.

The zod schemas enforce both structure and cross-field relationships (e.g., a `Frames` product cannot emit `accessory` variants). Consumers should always parse incoming objects with `NormalizedProductSchema` or the helper utilities in `normalizers.ts` to guarantee correctness.

## Normalization adapters

Adapters transform vendor payloads into the normalized shape. They implement the `NormalizationAdapter` interface and register themselves through [`packages/web/src/lib/catalog/normalization/adapters/index.ts`](../../packages/web/src/lib/catalog/normalization/adapters/index.ts). Each adapter exposes:

- a unique `key` for logging / persistence,
- vendor metadata (`slug`, `name`),
- an `inputSchema` that validates the raw payload, and
- a `normalize` function that returns a `NormalizedProduct`.

If parsing fails, the registry throws typed errors (`NormalizationInputError`, `NormalizationExecutionError`, `NormalizationOutputError`) so API routes can map them to HTTP responses.

### Vendor onboarding SDK

Use the scaffolding CLI to bootstrap a new adapter skeleton from [`adapter.template.ts`](../../packages/web/src/lib/catalog/normalization/adapters/template/adapter.template.ts):

```sh
pnpm tsx scripts/vendors/new-adapter.ts <slug> --name "Vendor Name"
```

The command generates `packages/web/src/lib/catalog/normalization/adapters/<slug>.ts`, registers it in the adapter index, and adds the friendly label to [`vendorSlugs.ts`](../../packages/web/src/lib/catalog/vendorSlugs.ts). Pass `--dry-run` to preview changes or `--force` to overwrite an existing adapter during iterations.

After implementing the normalization logic, verify the wiring with:

```sh
pnpm tsx scripts/vendors/validate-adapter.ts <slug>
```

The validator confirms the adapter file imports, registry registration, and vendor label mapping before you plug real payloads into the preview API.

### MOSCOT adapter

[`packages/web/src/lib/catalog/normalization/adapters/moscot.ts`](../../packages/web/src/lib/catalog/normalization/adapters/moscot.ts) maps MOSCOT scraper rows to the normalized structure. Highlights:

- Accepts both frame and accessory items.
- Coerces vendor-specific measurements, color, usage, and fit metadata.
- Produces fallback variants when the vendor omits variant rows to maintain schema guarantees.
- Preserves vendor confidence metadata inside `extras.sourceConfidence`.

## Preview API

`POST /api/catalog/vendor-sync/[slug]/normalize/preview` provides a quick way to validate sample payloads during adapter development.

- Requires a service JWT with either `catalog:sync:write` or `catalog:normalize:preview` scope.
- Body: `{ "item": <vendorPayload> }`
- Response: `{ ok: true, vendor, product }` on success.

Error responses surface validation problems with clear error codes (`invalid_vendor_payload`, `vendor_not_supported`, etc.).

The API reuses the normalization registry, guaranteeing that preview results match production normalization.

## Testing

Unit tests live under `tests/normalization` and cover both schema behavior and MOSCOT adapter mapping. API-level tests for the preview route live at `tests/api/vendor-sync/normalize-preview.test.ts`. Execute the entire suite with:

```sh
pnpm exec tsx --test
```
