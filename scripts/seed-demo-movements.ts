#!/usr/bin/env tsx
// TODO(typing): Prisma v6 typings cleanup; replace with proper generated types and remove this guard.
/**
 * Seed realistic StockMovement demo data.
 *
 * - Creates ~20 outbound (sales) movements per day by default
 * - Adds occasional inbound restocks to avoid running out
 * - Updates StoreStock.qty alongside every movement
 *
 * Usage:
 *   pnpm tsx scripts/seed-demo-movements.ts --days 45 --daily 22
 *
 * Notes:
 * - Idempotency is not guaranteed (this adds *new* movements).
 * - Run against your demo DB (Neon) only.
 */
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ---- tiny args parser
const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=\s]+)(?:=(.*))?$/);
  if (m) args.set(m[1], m[2] ?? 'true');
}
const DAYS = Math.max(1, Math.min(90, Number(args.get('days') ?? 30)));
const DAILY = Math.max(5, Math.min(100, Number(args.get('daily') ?? 20))); // avg outbound/day
const RESTOCK_EVERY = Math.max(5, Math.min(30, Number(args.get('restockEvery') ?? 7)));
const RESTOCK_QTY = Math.max(5, Math.min(120, Number(args.get('restockQty') ?? 30)));
const DRY_RUN = args.get('dryRun') === 'true';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function poisson(lambda: number) {
  // very small, simple Poisson sampler
  const L = Math.exp(-lambda);
  let k = 0,
    p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}
function isoAt(d: Date, h: number, m: number) {
  const x = new Date(d);
  x.setHours(h, m, randInt(0, 59), randInt(0, 999));
  return x;
}

async function main() {
  const store = await prisma.store.findFirst();
  if (!store) {
    console.error('No Store found — seed stores first.');
    process.exit(1);
  }

  // A reasonable subset of SKUs to draw from
  const stocks = await prisma.storeStock.findMany({
    where: { storeId: store.id },
    include: { product: true },
    take: 1200,
  });
  if (stocks.length === 0) {
    console.error('No StoreStock found — run seed-demo-stock.ts first.');
    process.exit(1);
  }

  // Slight preference for SKUs with qty > 0 initially
  const pool = stocks.map((s) => ({
    id: s.id,
    storeId: s.storeId,
    productId: s.productId,
    sku: s.product.sku,
    name: s.product.name,
    qty: s.qty,
  }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (DAYS - 1));

  let totalOut = 0,
    totalIn = 0,
    daysWritten = 0;

  for (let d = 0; d < DAYS; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);

    // sales today: Poisson around DAILY, minimum a couple
    const targetOutbound = Math.max(2, poisson(DAILY));

    // pick SKUs for sales (allow repeats to simulate multiple sales same day)
    const salesBatches: Array<{ idx: number; qty: number }> = [];
    for (let i = 0; i < targetOutbound; i++) {
      const idx = randInt(0, pool.length - 1);
      // sometimes sell 2 of the same SKU
      const qty = Math.random() < 0.15 ? 2 : 1;
      salesBatches.push({ idx, qty });
    }

    const txTasks: Prisma.PrismaPromise<any>[] = [];

    // Outbound (sales)
    for (const sale of salesBatches) {
      const row = pool[sale.idx];
      // if we don't have stock, skip or we will restock below
      if (row.qty <= 0) continue;

      const before = row.qty;
      const delta = -Math.min(sale.qty, before); // clamp so we don't go negative
      const after = before + delta;
      row.qty = after;

      const at = isoAt(day, randInt(9, 18), randInt(0, 59));
      txTasks.push(
        prisma.stockMovement.create({
          data: {
            storeId: row.storeId,
            productId: row.productId,
            qtyBefore: before,
            qtyAfter: after,
            delta,
            reason: 'Sale',
            note: null,
            at,
          },
        }),
      );
      txTasks.push(
        prisma.storeStock.update({
          where: { id: row.id },
          data: { qty: after, updatedAt: at },
        }),
      );
      totalOut += Math.abs(delta);
    }

    // Restock a slice of SKUs every RESTOCK_EVERY days
    if (d % RESTOCK_EVERY === RESTOCK_EVERY - 1) {
      const restockCount = Math.max(3, Math.round(pool.length * 0.02)); // ~2% of SKUs
      for (let i = 0; i < restockCount; i++) {
        const idx = randInt(0, pool.length - 1);
        const row = pool[idx];
        const before = row.qty;
        const delta = RESTOCK_QTY;
        const after = before + delta;
        row.qty = after;
        const at = isoAt(day, randInt(7, 10), randInt(0, 59)); // mornings
        txTasks.push(
          prisma.stockMovement.create({
            data: {
              storeId: row.storeId,
              productId: row.productId,
              qtyBefore: before,
              qtyAfter: after,
              delta,
              reason: 'Received',
              note: null,
              at,
            },
          }),
        );
        txTasks.push(
          prisma.storeStock.update({
            where: { id: row.id },
            data: { qty: after, updatedAt: at },
          }),
        );
        totalIn += delta;
      }
    }

    if (!DRY_RUN && txTasks.length > 0) {
      await prisma.$transaction(txTasks);
    }
    daysWritten++;
    process.stdout.write(`\r[demo movements] ${d + 1}/${DAYS} days …`);
  }

  console.log(
    `\n✔ Seeded movements for ${daysWritten} days: +${totalIn} inbound, -${totalOut} outbound.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
