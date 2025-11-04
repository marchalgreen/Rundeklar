#!/usr/bin/env tsx

// TODO(typing): Prisma v6 enum/Client types; align to schema and remove this guard.
import path from 'node:path';
import fs from 'node:fs/promises';
import { PrismaClient, ProductCategory } from '@prisma/client';

const prisma = new PrismaClient();

type CatalogVariant = {
  id?: string;
  sku?: string;
  sizeLabel?: string;
  color?: { name?: string };
  usage?: 'optical' | 'sun' | 'both';
  barcode?: string;
};
type CatalogProduct = {
  catalogId: string;
  brand?: string;
  model?: string;
  name?: string;
  category: 'Frames' | 'Lenses' | 'Contacts' | 'Accessories';
  source?: { supplier?: string; url?: string };
  variants?: CatalogVariant[];
};

function toCategory(c: CatalogProduct['category']): ProductCategory {
  if (c === 'Frames') return 'Frames';
  if (c === 'Accessories') return 'Accessories';
  if (c === 'Lenses') return 'Lenses';
  if (c === 'Contacts') return 'Contacts';
  return 'Frames';
}

async function main() {
  const demoPath = path.join(process.cwd(), 'public', 'demo', 'moscot.catalog.json');
  const buf = await fs.readFile(demoPath, 'utf8');
  const list: CatalogProduct[] = JSON.parse(buf);

  // 1️⃣  Demo store
  let store = await prisma.store.findFirst();
  if (!store) {
    store = await prisma.store.create({
      data: { email: 'demo@clairity.app', password: 'demo-hash' },
    });
    console.log('✔ Created demo store', store.id);
  }

  // 2️⃣  Upsert products + stock
  let created = 0;
  for (const p of list.slice(0, 600)) {
    const variants = p.variants?.length ? p.variants : [undefined];
    for (const v of variants) {
      const sku = (v?.sku || `${p.catalogId}-${v?.id || 'base'}`).trim().toLowerCase();
      const name = p.name || [p.brand, p.model].filter(Boolean).join(' ').trim() || p.catalogId;
      const color = v?.color?.name;
      const sizeLabel = v?.sizeLabel;
      const suffix = [color, sizeLabel].filter(Boolean).join(' · ');
      const fullName = suffix ? `${name} — ${suffix}` : name;

      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          name: fullName,
          brand: p.brand,
          model: p.model,
          color,
          sizeLabel,
          usage: v?.usage,
          supplier: p.source?.supplier ?? 'MOSCOT',
          catalogUrl: p.source?.url,
          category: toCategory(p.category),
        },
        create: {
          sku,
          name: fullName,
          brand: p.brand,
          model: p.model,
          color,
          sizeLabel,
          usage: v?.usage,
          supplier: p.source?.supplier ?? 'MOSCOT',
          catalogUrl: p.source?.url,
          category: toCategory(p.category),
        },
      });

      const h = [...sku].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
      const demoQty = h % 6;

      await prisma.storeStock.upsert({
        where: {
          store_product_unique: { storeId: store.id, productId: product.id },
        },
        update: { qty: demoQty, updatedAt: new Date() },
        create: {
          storeId: store.id,
          productId: product.id,
          qty: demoQty,
        },
      });
      created++;
    }
  }

  console.log(`✔ Seeded ${created} stock rows for store ${store.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
