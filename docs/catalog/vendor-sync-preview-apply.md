# Vendor sync preview & apply

The preview/apply flow lets catalog services normalize vendor feeds, inspect the resulting diff against current products, and then apply inventory updates. Both endpoints require a service JWT with the `catalog:sync:write` scope.

## Endpoints

- `POST /api/catalog/vendor-sync/{slug}/preview` – normalize and diff items without mutating data.
- `POST /api/catalog/vendor-sync/{slug}/apply` – run the same diff and persist product, catalog, and store stock changes.

Both routes accept either inline vendor payloads (`items`) or a `sourcePath` pointing to a catalog file. When `items` is empty and `sourcePath` is provided, the API attempts to read and parse the external file before normalization.

### Request body

```json
{
  "items": [
    {
      "catalogId": "LEMTOSH-BLACK",
      "name": "Moscot Lemtosh",
      "variants": [
        {
          "sizeLabel": "46-24-145",
          "barcode": "7391893330010"
        }
      ]
    }
  ],
  "sourcePath": null,
  "limit": 100
}
```

- `items` (optional): array of raw vendor payloads passed to the normalization adapter.
- `sourcePath` (optional): file path or URL for batch jobs (the request may omit `items`).
- `limit` (optional): maximum number of items to load from `sourcePath`.

### Response shape

Successful requests respond with:

```json
{
  "ok": true,
  "vendor": "moscot",
  "mode": "preview",
  "dryRun": true,
  "meta": { "type": "inline", "count": 1 },
  "normalizedCount": 1,
  "diff": {
    "hash": "…",
    "counts": { "total": 1, "created": 1, "updated": 0, "unchanged": 0, "removed": 0 },
    "items": [
      {
        "catalogId": "LEMTOSH-BLACK",
        "status": "new",
        "catalogItemId": null,
        "product": {
          "before": null,
          "after": { "sku": "moscot:LEMTOSH-BLACK", "name": "Moscot Lemtosh", "category": "Frames", … },
          "changes": []
        },
        "stocks": [
          {
            "storeStockId": "stock_existing",
            "storeId": "store-1",
            "before": { "qty": 0, "barcode": null },
            "after": { "qty": 1, "barcode": "7391893330010" },
            "changed": true
          }
        ],
        "normalized": { "catalogId": "LEMTOSH-BLACK", … }
      }
    ],
    "removed": []
  },
  "run": {
    "runId": "run-stub",
    "summary": {
      "vendor": "moscot",
      "hash": "…",
      "total": 1,
      "created": 1,
      "updated": 0,
      "unchanged": 0,
      "removed": 0,
      "dryRun": true,
      "durationMs": 532,
      "finishedAt": "2025-10-20T12:45:31.493Z",
      "sourcePath": "(inline)"
    }
  }
}
```

Apply mode (`mode: "apply"`) follows the same shape but persists the diff, updates store stock quantities, and writes the latest run summary to `vendorSyncState`.

## cURL examples

Preview with inline items:

```bash
curl -X POST \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  "https://clairity.local/api/catalog/vendor-sync/moscot/preview" \
  -d '{
    "items": [
      {
        "catalogId": "LEMTOSH-BLACK",
        "name": "Moscot Lemtosh",
        "variants": [{ "sizeLabel": "46-24-145", "barcode": "7391893330010" }]
      }
    ]
  }'
```

Apply from a catalog snapshot stored on disk:

```bash
curl -X POST \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  "https://clairity.local/api/catalog/vendor-sync/moscot/apply" \
  -d '{
    "sourcePath": "/var/catalogs/moscot/catalog.json",
    "limit": 250
  }'
```

Both commands return the diff summary, including counts (`created`, `updated`, `unchanged`, `removed`), the aggregate hash, and a snapshot of the run metadata for observability tooling.
