// src/lib/auth/data.seed.ts
import { hash } from '@node-rs/argon2';
import { getPrisma, PrismaClient } from '../db';

async function main(): Promise<PrismaClient> {
  const prisma = await getPrisma();
  // Demo credentials
  const storeEmail = 'owner@clairity.demo';
  const storePasswordPlain = 'demo1234'; // change if you prefer

  // Hash store password + PIN (argon2)
  const passHash = await hash(storePasswordPlain);
  const pin1111 = await hash('1111');

  // Upsert Store
  const store = await prisma.store.upsert({
    where: { email: storeEmail },
    update: { password: passHash },
    create: { email: storeEmail, password: passHash },
  });

  // Employees (slugs must match the login UI)
  const employees = [
    { slug: 'soren-nichlas-frid', name: 'Søren Nichlas Frid' },
    { slug: 'lars-madsen', name: 'Lars Madsen' },
    { slug: 'dorthea-norgaard', name: 'Dorthea Nørgaard' },
    { slug: 'michelle-fridahl', name: 'Michelle Fridahl' },
    { slug: 'rasmus-frid-norgaard', name: 'Rasmus Frid Nørgaard' },
    { slug: 'mette-sorensen', name: 'Mette Sørensen' },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { slug_storeId: { slug: emp.slug, storeId: store.id } },
      update: { name: emp.name, pinHash: pin1111 },
      create: {
        storeId: store.id,
        slug: emp.slug,
        name: emp.name,
        pinHash: pin1111,
      },
    });
  }

  console.log('✅ Seed complete');
  console.log('   Email:', storeEmail);
  console.log('   Password:', storePasswordPlain);
  console.log('   Employee PIN:', '1111');

  return prisma;
}

main()
  .then(async (prisma) => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    const prisma = await getPrisma();
    await prisma.$disconnect();
    process.exit(1);
  });
