# 🕶️ MOSCOT Catalog Scraper — Clairity Vendor Adapter

> **Source:** `src/lib/scrapers/moscot.ts`  
> **CLI:** `scripts/moscot-scrape.ts`  
> **Output:** `/tmp/moscot.catalog.json`

---

## 📖 Overview

This adapter crawls the public [moscot.com](https://moscot.com) storefront and produces a
structured `CatalogProduct[]` dataset used to bootstrap **Clairity’s vendor catalog**.

The scraper simulates a vendor integration — in production, this will later be replaced
by official vendor APIs (e.g. Luxottica, Essilor, Hoya, Zeiss).

It is **read-only, polite**, and throttled to avoid stressing MOSCOT’s servers.

---

## ⚙️ Run (Quick Start)

```bash
# Environment flags
export MOSCOT_PAGES=2            # pages per collection
export MOSCOT_CONCURRENCY=2      # parallel PDP requests
export MOSCOT_OUTPUT="/tmp/moscot.catalog.json"

# Run via package script
pnpm scrape:moscot:quick

Default settings:

BASE=https://moscot.com
COLLECTIONS=/collections/eyeglasses,/collections/sunglasses,/collections/moscot-originals-eyeglasses


⸻

🧠 How It Works

1️⃣ Collections → Handles

The scraper reads product handles (/products/...) from each collection page, up to
MOSCOT_PAGES per collection.

2️⃣ Handles → PDP Parsing

Each PDP is parsed for:
	•	Product title, family, tags, and price
	•	Color/size variants
	•	Photos (limited to 3 per product)
	•	Story/description (sanitized HTML)
	•	Measurements (Lens/Bridge/Temple)
	•	Collections and marketing tags
	•	Virtual Try-On availability

3️⃣ Mapping → CatalogProduct

Each MoscotPDP is mapped to the unified Clairity schema:
src/types/product.ts.

Field	Description
catalogId	Product handle (lemtosh, miltzen, etc.)
brand	Always MOSCOT
category	Frames or Accessories
photos[]	3 best Shopify CDN images, angle-aware
variants[]	Cartesian of sizes × colors
storyHtml	Sanitized, text-only content
collections[]	Marketing tags (deduped)
price	{ amount, currency } preserved
source	Supplier metadata (url, lastSyncISO)


⸻

🧩 Environment Flags

Variable	Default	Description
MOSCOT_BASE	https://moscot.com	Root site URL
MOSCOT_COLLECTIONS	(3 default paths)	Comma-separated list of collection URLs
MOSCOT_PAGES	10	Max collection pages to crawl
MOSCOT_CONCURRENCY	2	Concurrent PDP fetches
MOSCOT_OUTPUT	/tmp/moscot.catalog.json	Output path for final catalog
MOSCOT_SLEEP_MS	350	Delay between requests (hard-coded in adapter)


⸻

🧱 File Structure

scripts/
  ├─ moscot-scrape.ts       # CLI entrypoint with progress logs
src/
  └─ lib/
     └─ scrapers/
        └─ moscot.ts         # Core adapter (collections + PDP parsing)
tmp/
  └─ moscot.catalog.json     # Generated dataset (CatalogProduct[])


⸻

🧰 Sample Output

{
  "catalogId": "lemtosh",
  "brand": "MOSCOT",
  "category": "Frames",
  "price": { "amount": 320, "currency": "USD" },
  "photos": [
    {
      "url": "https://moscot.com/cdn/shop/files/lemtosh-color-tortoise-pos-1_1800x.jpg",
      "angle": "front",
      "colorwayName": "Tortoise"
    }
  ],
  "variants": [
    { "color": { "name": "Tortoise" }, "sizeLabel": "49", "fit": "average" }
  ],
  "collections": ["Originals", "Custom Tints"],
  "storyHtml": "<p>The LEMTOSH has a smart look...</p>",
  "source": {
    "supplier": "MOSCOT",
    "url": "https://moscot.com/products/lemtosh-tortoise",
    "confidence": "verified"
  }
}


⸻

🧩 Output Stats

Metric	Typical value
Products	120–130
Photos per product	3
Variants per product	1–4
File size	~8000 lines / ~0.8 MB (pretty-printed)


⸻

🧹 Data Hygiene Rules
	•	Photos limited to 3 per product (front, quarter, side priority)
	•	Only /cdn/shop/... Shopify CDN images kept
→ flags, logos, and icons excluded
	•	Story HTML stripped of CSS, scripts, and footers
	•	Collections & tags deduped
	•	Currency & price preserved
	•	Variants built with unique sku:
handle-Color-Size (e.g. lemtosh-Tortoise-49)
	•	Category inferred by title/tags:
	•	"CHAMOIS 3 PACK" → Accessories
	•	"LEMTOSH 49 TORTOISE" → Frames

⸻

🧾 Validation Checks

After a scrape, you can sanity check:

jq 'length' /tmp/moscot.catalog.json               # total products
jq 'map(.photos|length) | add' /tmp/moscot.catalog.json   # total photos
jq '[.[].photos[] | select(.url|test("/static/"))] | length' /tmp/moscot.catalog.json   # should be 0
jq '.[0] | {catalogId, name, category, photos: (.photos|length)}' /tmp/moscot.catalog.json


⸻

🧱 Roadmap
	•	Add live progress ticker (parsed 42/121 PDPs…)
	•	Support multi-currency (EUR/USD auto-detect)
	•	Add vendor adapter interface for other suppliers (Luxottica, Essilor)
	•	Expand to lenses/contacts via vendor APIs

⸻

© 2025 Clairity • internal tooling • MIT-licensed

---

# ✅ 2️⃣ `docs/inventory-module.md`

This one is a broader, high-level README for your **Varelager** feature.
It’s written for both developers and stakeholders.
```
