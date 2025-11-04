# 🕶️ MOSCOT Catalog Scraper — Clairity Inventory Bootstrapper

> **Files:**
>
> - Core: `src/lib/scrapers/moscot.ts`
> - CLI: `scripts/moscot-scrape.ts`
> - Output: `/tmp/moscot.catalog.json`

---

## 📖 Overview

This is a **read-only, polite web scraper** for the public [moscot.com](https://moscot.com) storefront.  
It is used to **bootstrap the Frames catalog** inside Clairity’s **Varelager** (inventory) module.

The scraper simulates a supplier sync:  
it crawls MOSCOT eyeglass and sunglass collections, extracts product data, and writes structured JSON output.

> ⚠️ No authentication or hidden APIs are used.  
> The scraper runs locally, throttles requests, and respects polite crawling limits.

---

## ⚙️ Quick Start

```bash
pnpm scrape:moscot:quick
```

This runs:

- `MOSCOT_PAGES=2` → crawls the first 2 pages of each collection
- `MOSCOT_CONCURRENCY=1` → serial requests for safety
- Output file → `/tmp/moscot.catalog.json`

Console output example:

```
Wrote 52 products → /tmp/moscot.catalog.json
```

---

## 📦 What It Collects

| Category           | Data Captured                            | Example                                 |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| **Product Info**   | Title, family, description, price        | `"LEMTOSH"`, `Originals`, `295 USD`     |
| **Variants**       | Colors × Sizes                           | `"Black"`, `"Tortoise"`, `"49"`, `"52"` |
| **Measurements**   | Lens width, bridge, temple, fit          | `{ "lensWidth": 49, "bridge": 24 }`     |
| **Features**       | Materials, hinges, build notes           | `"Italian acetate"`, `"7-barrel hinge"` |
| **Photos**         | Hero + gallery image URLs                | `https://cdn.moscot.com/...jpg`         |
| **Tags**           | Originals, Custom Tints, Clip-compatible | `["Originals", "Clip-compatible"]`      |
| **Virtual Try-On** | Detected flag                            | `true`                                  |

---

## 🧠 Example Output

```json
{
  "url": "https://moscot.com/products/lemtosh",
  "handle": "lemtosh",
  "title": "LEMTOSH",
  "family": "Originals",
  "price": { "amount": 295, "currency": "USD" },
  "colors": ["Black", "Tortoise", "Honey"],
  "sizes": ["46", "49", "52"],
  "features": ["Handcrafted using Italian acetate", "Diamond rivets", "7-barrel hinge"],
  "storyHtml": "<p>Handmade in Italy...</p>",
  "photos": [
    { "url": "https://cdn.moscot.com/...hero.jpg", "isHero": true },
    { "url": "https://cdn.moscot.com/...side.jpg" }
  ],
  "variants": [
    {
      "color": "Black",
      "sizeLabel": "49",
      "price": { "amount": 295, "currency": "USD" },
      "measurements": { "lensWidth": 49, "bridge": 24, "temple": 145 },
      "fit": "average"
    }
  ],
  "tags": ["Originals", "Clip-compatible"],
  "virtualTryOn": true
}
```

---

## 🖼️ Photos & Variants

### 📷 Photos

- Extracted from all `<img>` tags with CDN sources.
- URLs are normalized (add `https:` if missing).
- Filters out icons, sprites, and logos.
- Includes hero + model + detail shots.

### 🎨 Variants

- Built as combinations of **color × size**.
- Includes optional `fit` (derived from size) and shared price.
- Measurements parsed from the “Measurements” block on each PDP.

Result: You get **variant-level records** with color, size, fit, and measurement data.

---

## ⚖️ Politeness Rules

| Setting         | Behavior                                        |
| --------------- | ----------------------------------------------- |
| **User-Agent**  | `ClairityCatalogBot/1.0 (+https://example.com)` |
| **Delay**       | 400 ms between requests                         |
| **Concurrency** | Default: 2 (configurable)                       |
| **Scope**       | Public PDPs only                                |
| **Writes**      | JSON only — no DB or asset downloads            |

---

## 🔧 Configuration

| Env Var              | Default                    | Description              |
| -------------------- | -------------------------- | ------------------------ |
| `MOSCOT_BASE`        | `https://moscot.com`       | Base domain              |
| `MOSCOT_PAGES`       | `8`                        | Max pages per collection |
| `MOSCOT_CONCURRENCY` | `2`                        | Parallel fetches         |
| `MOSCOT_OUT`         | `/tmp/moscot.catalog.json` | Output file path         |

Example:

```bash
MOSCOT_PAGES=4 MOSCOT_CONCURRENCY=2 pnpm scrape:moscot
```

---

## 🧩 Integration

This scraper’s output matches the shape of Clairity’s extended types in
`src/types/product.ts` (FrameVariant, CatalogPhoto, etc.).

Mapping will later be handled by a small transformer script (not included here).

---

## 🧰 Developer Notes

- Implementation uses:
  - **Cheerio** for HTML parsing
  - **p-limit** for request throttling
  - **Zod** for data validation (optional next step)

- Safe to re-run anytime — no persistence side effects.
- To inspect results:

```bash
cat /tmp/moscot.catalog.json | less
```

or format it:

```bash
jq '.' /tmp/moscot.catalog.json | less
```

---

## 🗑️ Cleanup

To remove generated data:

```bash
rm -f /tmp/moscot.catalog.json
```

---

**Author:** Clairity Dev Team
**License:** Internal Use Only
**Purpose:** Supplier data normalization / Inventory bootstrapper

```

---

✅ This README:
- Lives cleanly alongside your dev docs (`docs/scraper-moscot.md`)
- Explains exactly what’s fetched, how, and why
- Confirms that photos *and* variants are included
- Requires no reference to the broader repo to understand usage
```
