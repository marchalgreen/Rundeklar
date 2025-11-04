# Vendor onboarding SDK

The vendor onboarding SDK streamlines adapter creation, registration, and validation so new vendor integrations can reach the preview API without hand-editing multiple files.

## 1. Scaffold an adapter

```sh
pnpm tsx scripts/vendors/new-adapter.ts <slug> --name "Vendor Name"
```

The CLI performs three steps:

1. Generates `packages/web/src/lib/catalog/normalization/adapters/<slug>.ts` from [`adapter.template.ts`](../../packages/web/src/lib/catalog/normalization/adapters/template/adapter.template.ts).
2. Registers the adapter in [`adapters/index.ts`](../../packages/web/src/lib/catalog/normalization/adapters/index.ts) so `normalizeVendorItem` discovers it automatically.
3. Adds the friendly label to [`vendorSlugs.ts`](../../packages/web/src/lib/catalog/vendorSlugs.ts) so downstream UI surfaces the vendor name.

Use `--dry-run` to preview changes or `--force` when iterating on an existing scaffold.

## 2. Implement normalization

Fill in the schema and `normalize<Slug>Product` function inside the generated adapter file. Add fixtures and tests under `tests/normalization` to capture vendor-specific expectations.

## 3. Validate wiring

Run the validator to ensure the adapter loads correctly and is available through the registry:

```sh
pnpm tsx scripts/vendors/validate-adapter.ts <slug>
```

The validator checks the adapter file, `inputSchema`, registry registration, and vendor label mapping. Pass `--json` for machine-readable output.

## 4. Preview normalization

With the adapter in place you can call `POST /api/catalog/vendor-sync/<slug>/normalize/preview` immediately—no manual API updates required. The API uses the shared adapter registry, so the new slug is available as soon as the adapter file and index entry land in the repository.
