# Clairity Vendor Adapter Basics

> 📘 For engineers contributing new vendor integrations to Clairity Desktop-Web.  
> This document explains how vendor adapters work, how to scaffold one, and how to validate it end-to-end.

---

## 🧩 What Is a Vendor Adapter?

A **vendor adapter** translates a vendor’s unique catalog format into Clairity’s standard `NormalizedProduct` schema.

Every optical brand structures their product data differently (CSV, JSON, API, scraper output).  
Adapters make these catalogs compatible with Clairity’s sync and inventory systems.

In short:

| Input                                      | Output                                       |
| ------------------------------------------ | -------------------------------------------- |
| Raw vendor payload                         | `NormalizedProduct` objects                  |
| “frames.json” or `GET /api/vendor/catalog` | A universal structure understood by Clairity |
| Heterogeneous data                         | Clean, consistent inventory data             |

---

## 🧱 File Structure

All adapters live under:

src/lib/catalog/normalization/adapters/

Example layout:

adapters/
├── moscot.ts
├── acme.ts
├── index.ts
└── hasAdapter.ts

### `index.ts`

Exports all registered adapters and provides:

- `getNormalizationAdapter(slug)`
- `listNormalizationAdapters()`

Adapters register themselves automatically via the registry:

```ts
const adapters: AdapterEntry[] = [
  moscotNormalizationAdapter,
  acmeNormalizationAdapter,
  // @vendor-sdk:adapters (CLI auto-inserts new ones)
];


⸻

⚙️ Anatomy of an Adapter

Each adapter exports:

export const acmeNormalizationAdapter: NormalizationAdapter<AcmeRawProduct> = {
  key: 'acme',
  vendor: { slug: 'acme', name: 'Acme' },
  inputSchema: AcmeRawProductSchema,
  normalize: normalizeAcmeProduct,
};

1️⃣ Raw Schema

Use Zod to describe the vendor’s native format:

export const AcmeRawProductSchema = z
  .object({
    catalogId: z.string(),
    category: z.string(),
    brand: z.string().optional(),
    variants: z.array(z.object({ id: z.string().optional() })).optional(),
  })
  .passthrough();

export type AcmeRawProduct = z.infer<typeof AcmeRawProductSchema>;

2️⃣ Normalization Function

Map the raw payload into a standardized structure:

export function normalizeAcmeProduct(raw: AcmeRawProduct): NormalizedProduct {
  return {
    vendor: { slug: 'acme', name: 'Acme' },
    catalogId: raw.catalogId,
    name: raw.brand ? `${raw.brand} ${raw.catalogId}` : raw.catalogId,
    category: 'Frames',
    photos: [],
    source: {},
    variants: [
      {
        id: `${raw.catalogId}:variant`,
        type: 'frame',
      },
    ],
    raw,
  };
}


⸻

🧰 Creating a New Adapter (SDK CLI)

Use the built-in vendor SDK scripts:

# Scaffold a new adapter
pnpm tsx scripts/vendors/new-adapter.ts <slug>

# Example:
pnpm tsx scripts/vendors/new-adapter.ts zeiss

This will:
	•	Create src/lib/catalog/normalization/adapters/zeiss.ts
	•	Register it in index.ts
	•	Add placeholder schema + normalize() function

⸻

✅ Validating an Adapter

Run the validation script:

pnpm tsx scripts/vendors/validate-adapter.ts <slug>

This checks:
	•	Adapter is imported and registered
	•	Schema + normalize() exports are valid
	•	Vendor slug matches metadata
	•	Adapter compiles without type errors

⸻

🧪 Testing Your Adapter

Each adapter should have a test under tests/normalization/:

import { normalizeZeissProduct } from '@/lib/catalog/normalization/adapters/zeiss';
import { NormalizedProductSchema } from '@/lib/catalog/normalizationSchemas';
import { ZeissRawSample } from '../mocks/catalogSamples';

test('normalizeZeissProduct produces valid NormalizedProduct', () => {
  const normalized = normalizeZeissProduct(ZeissRawSample);
  const parsed = NormalizedProductSchema.parse(normalized);
  expect(parsed.vendor.slug).toBe('zeiss');
});

Run the suite:

pnpm exec tsx --test


⸻

🧩 Integrating with the Platform

Once merged:
	1.	Registry updates automatically — getNormalizationAdapter('zeiss') returns your adapter.
	2.	The UI (/vendor-sync/vendors) will display a green “Adapter registreret” badge.
	3.	Ops can run:

curl -sS -X POST http://localhost:3000/api/catalog/vendor-sync/zeiss/normalize/preview \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "item": { "catalogId":"ZEISS-001","category":"Frames" } }' | jq



⸻

🧭 Adapter Lifecycle

Stage	Description
1. Scaffold	new-adapter.ts creates template
2. Implement	Fill in schema + normalize()
3. Validate	validate-adapter.ts confirms structure
4. Test	Add unit test under tests/normalization/
5. Onboard	Ops creates vendor via UI wizard
6. Sync	/api/catalog/vendor-sync/[slug]/sync uses your adapter in production


⸻

💡 Tips & Conventions
	•	Keep adapter logic pure — no network calls, DB, or side effects.
	•	Use Zod for all vendor input validation.
	•	Name functions consistently:
normalize<BrandName>Product()
	•	Use NormalizedProductSchema.parse() in tests to guarantee shape correctness.
	•	Always include a raw field in the normalized object for traceability.

⸻

🔗 Related Files

Path	Purpose
src/lib/catalog/normalizationSchemas.ts	Defines NormalizedProduct structure
src/lib/catalog/normalization/adapters/index.ts	Registry of all adapters
src/lib/catalog/normalization/adapters/hasAdapter.ts	Helper for UI badges
tests/normalization/*.test.ts	Unit tests for adapters
docs/catalog/vendor-onboarding-ui.md	UI onboarding flow (non-dev)


⸻

Maintainer note:
If you update the adapter interface or schema, bump the version in /docs/catalog/adapter-basics.md and /scripts/vendors/templates/adapter.ts.

⸻

Clairity Engineering — Vendor Platform Team

---

### ✅ Next step
Add the file, commit it:
```
