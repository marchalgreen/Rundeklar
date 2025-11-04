# 🧾 EPIC: Payment / Orders / POS Module — v1.0

**Owner:** Core Team (Clairity)
**Status:** Planned → Active
**Last updated:** 2025-10-28
**Path:** `/docs/epics/POS/EPIC-pos-v1.0.md`
**Docs target:** `/docs/pos/**`

---

## Executive Summary

The **Payment / Orders / POS Module** introduces a complete in-store checkout system for the Clairity workspace.
It allows staff to scan items, manage orders, accept payments (card, cash, MobilePay), and produce receipts — all within a windowed macOS-style interface consistent with the platform’s Inventory and Calendar modules.

The module runs as a **desktop window (`Kasse`)**, built on real Prisma models (`Order`, `OrderItem`, `Payment`) and tightly coupled with **Inventory Movements** to maintain stock accuracy.
Payment processing uses a **mock terminal API** in v1, paving the way for integration with real payment gateways and accounting systems in later versions.

This Epic defines the **canonical architecture, API surface, UI model, and validation gates** for all future POS work.

---

## 1. Architecture Overview

### 1.1 Runtime & Framework

- **Framework:** Next.js 15 (App Router) + React 19.1
- **Language:** TypeScript 5 (strict mode)
- **UI System:** Tailwind v4 tokens + shadcn/ui + lucide-react
- **Motion:** 160–200 ms, `cubic-bezier(.2,.8,.2,1)`; respects reduced-motion
- **State:** `usePOS()` Zustand slice (`src/store/pos.ts`)
- **Database:** Prisma 6.17 — `Order`, `OrderItem`, `Payment` models
- **Integration:** Inventory module via `/api/inventory/movements`
- **API Surface:** `/api/pos/**` (orders, payments, receipts, reports)
- **Window Shell:** `/src/components/windows/POSWindow.tsx`

### 1.2 Module Layout

| Path                                    | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `/src/store/pos.ts`                     | Central state for cart, payment flow, and optimistic updates |
| `/src/app/api/pos/orders/**`            | CRUD for orders                                              |
| `/src/app/api/pos/payments/**`          | Mock payment terminal simulator                              |
| `/src/app/api/pos/receipts/**`          | Receipt generator                                            |
| `/src/app/api/pos/reports/**`           | Daily summary endpoint                                       |
| `/src/components/windows/POSWindow.tsx` | Window entrypoint ("Kasse")                                  |
| `/src/components/pos/**`                | Cart grid, payment panel, receipt modal                      |
| `/src/lib/pos/receipt.ts`               | Receipt number + print helpers                               |
| `/prisma/schema.prisma`                 | Adds Order, OrderItem, Payment models                        |

---

## 2. Capabilities

- **Scan / Search / Add Items** (via barcode or search; uses Inventory data)
- **Adjust quantity, price, and discount** via numeric pad or keyboard
- **Add custom items** (ad-hoc services or repairs)
- **Split payments** (any combination of Card, Cash, MobilePay)
- **Receipt handling:** print or email choice
- **Order drafts → finalize → Inventory movement**
- **Dashboard view:** daily totals + method breakdown
- **Mock terminal API:** delay simulation + fake card brand/last4
- **Keyboard shortcuts:** full checkout control without mouse
- **Persistent order history via Prisma**

---

## 3. UI & Interaction Model

### 3.1 Window & Layout

- **Window:** `POSWindow.tsx` — chrome title “Kasse (POS)”
- **Structure:** Two-column glass grid

  - **Left:** Order list (line items, quantity, discount, subtotal)
  - **Right:** Payment panel (totals, payment methods, checkout)

- **State restore:** Draft order persists across reloads (local cache)

### 3.2 Input & Keyboard

- **Enter** — Proceed to payment
- **Esc** — Clear order
- **⌘/Ctrl + N** — New order
- **⌘/Ctrl + P** — Print receipt
- **Numeric pad** — Edit quantity or price
- **Scan (barcode)** — Add matching item instantly

### 3.3 Payment Flow

1. Staff adds items → total updates in real time.
2. Choose payment methods (card / cash / MobilePay).
3. Mock `/api/pos/payments` simulates approval (≈ 1.2 s delay).
4. On success → order persisted → movement POSTed to Inventory.
5. Receipt dialog opens with **Print / Email** options.

### 3.4 Design System

- Glass surfaces using `hsl(var(--surface-2))`
- Hairlines via rings `ring-1 ring-[hsl(var(--line)/.12)]`
- Tokens:

  - `--pos-paid` (green/blue accent)
  - `--pos-due` (destructive/red tone)

- Typography: compact, clinical; all labels short and localized (da-DK).

---

## 4. API Surface (App Router)

| Route                      | Methods       | Purpose                                      |
| -------------------------- | ------------- | -------------------------------------------- |
| `/api/pos/orders`          | GET, POST     | List / create orders                         |
| `/api/pos/orders/[id]`     | PATCH, DELETE | Update / delete order                        |
| `/api/pos/payments`        | POST          | Simulated terminal (returns approval result) |
| `/api/pos/receipts/[id]`   | GET           | Receipt JSON for printing/email              |
| `/api/pos/reports/daily`   | GET           | Daily totals by payment method               |
| `/api/inventory/movements` | POST          | Trigger stock deduction after sale           |

All handlers follow the Calendar-style stub pattern (type-safe, no auth for demo).
Later versions will add accounting webhooks and fiscal export.

---

## 5. Data Model (Prisma)

```prisma
model Order {
  id            String   @id @default(cuid())
  storeId       String
  store         Store    @relation(fields: [storeId], references: [id])
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  total         Decimal
  paymentStatus String
  receiptNo     String   @unique
  createdAt     DateTime @default(now())
  items         OrderItem[]
  payments      Payment[]
}

model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  sku       String
  name      String
  quantity  Int
  price     Decimal
  discount  Decimal? @default(0)
}

model Payment {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  method    String
  amount    Decimal
  approved  Boolean
  reference String?
  createdAt DateTime @default(now())
}
```

### Migration Plan

```bash
pnpm prisma migrate dev --name pos-init
pnpm prisma generate
```

### Seed (demo data)

Create `prisma/seed.pos.ts`:

```ts
await prisma.order.create({
  data: {
    storeId: demoStore.id,
    employeeId: demoEmployee.id,
    receiptNo: 'DK01-2025-10-28-001',
    total: 1249.0,
    paymentStatus: 'paid',
    items: {
      create: [
        { sku: 'GLS001', name: 'Optic Glasses', quantity: 1, price: 999 },
        { sku: 'LENS002', name: 'Contact Lenses', quantity: 2, price: 125 },
      ],
    },
    payments: { create: { method: 'Card', amount: 1249, approved: true } },
  },
});
```

Run via:

```bash
pnpm seed
```

---

## 6. Inventory Integration

- On payment success → `POST /api/inventory/movements` with:

```json
{ "source": "pos", "orderId": "xxx", "items": [...] }
```

- Inventory deducts matching SKUs.
- This guarantees Inventory Dashboard reflects real-time sales.

---

## 7. Dashboard & Reports

**/api/pos/reports/daily** aggregates:

```json
{
  "date": "2025-10-28",
  "totals": {
    "Card": 5249.0,
    "Cash": 630.0,
    "MobilePay": 890.0
  },
  "orderCount": 22
}
```

Used by **POS Dashboard** tab showing:

- Total revenue ring chart
- Payment breakdown
- Top 5 items sold (mock aggregation)

---

## 8. Accessibility & Design System

- Tailwind v4 tokens only (`hsl(var(--token))`)
- Visible `.ring-focus` states
- No hard borders (rings for hairlines)
- Keyboard-navigable checkout flow
- Motion: 160–200 ms; respects reduced-motion
- Localized copy in Danish (`da-DK`)

---

## 9. Validation & Operational Notes

**Build Gates**

1. `pnpm run validate` → typecheck + lint
2. `pnpm build` → Prisma generate + Next build

**Manual Smoke**

- Open **Kasse (POS)** window
- Scan or search item → add to cart
- Adjust quantity via keypad
- Click “Betal” → choose Card + Cash split
- Wait for mock approval (≈ 1 s)
- Receipt dialog → Print / Email
- Verify `/inventory` reflects deduction
- Open Dashboard → totals update

Performance: smooth render < 16 ms frame; scroll 60 fps up to 100 orders.

---

## 10. Acceptance Criteria (testable)

| Area                | Criteria                                                              |
| ------------------- | --------------------------------------------------------------------- |
| **Orders**          | Create, edit, and finalize orders with accurate totals                |
| **Payments**        | Split payments succeed; mock API simulates delay and returns approval |
| **Receipts**        | Unique per-store-day numbering; print/email works                     |
| **Inventory Sync**  | Completed orders trigger stock deduction                              |
| **Dashboard**       | Daily totals reflect accurate breakdown                               |
| **UI / A11y**       | Focus rings visible; all flows keyboardable                           |
| **Tokens / Design** | No hard borders; ring-based hairlines; Tahoe glass aesthetic          |
| **Performance**     | 60 fps scroll; no layout thrash                                       |
| **Build Gates**     | `pnpm run validate` + `pnpm build` green                              |

---

## 11. Next Steps & Gaps

| Area                     | Action                                                         |
| ------------------------ | -------------------------------------------------------------- |
| **Terminal Integration** | Replace mock with real payment SDK (Nets / Stripe Terminal)    |
| **Accounting Sync**      | Add `/api/pos/export` for e-conomic/Dinero                     |
| **Refunds / Returns**    | Separate flow with reference receipts                          |
| **Compliance**           | Implement Danish fiscal API (Z-report + signature)             |
| **OpenAPI Spec**         | Generate `/api/docs/pos.json` + Swagger embed                  |
| **Docs Pipeline**        | Scaffold `/docs/pos/overview`, `/docs/pos/ui`, `/docs/pos/api` |

---

## 12. Validation & Rollout

**Local**

```bash
pnpm run validate
pnpm build
pnpm dev
```

**Manual**

- `/windows/Kasse` → smoke test checkout
- `/inventory` → confirm sync
- `/docs/pos/api/swagger` → Swagger renders

**Branch:** `feature/pos-module-v1`
**Rollback:** revert PR; `pnpm prisma migrate reset` if schema rollback needed.

---

## 13. Success Metrics

- Staff completes sale (scan → pay → receipt) < 10 s
- Split payment < 2 s processing latency
- Inventory sync within 1 s of completion
- 60 fps render at 100 order list entries
- ≥ 95 % of demo actions pass smoke tests on first run

---

## 14. Compliance Placeholders

- Fiscal export (Z-report) route stubbed `/api/pos/compliance/zreport`
- Audit log retention placeholder model for future regulation alignment

---

### ✅ Rollout Notes

- Passes all validation gates
- No external API secrets
- No schema conflicts with existing models
- Uses tokens and design system conventions
- Fully reversible migration

---

**End of EPIC — Payment / Orders / POS Module v1.0**
→ Source of truth for `/docs/pos/**` documentation scaffold.
