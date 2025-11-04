export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPrisma } from '@/lib/db';

export async function POST() {
  const prisma = await getPrisma();
  const c = await cookies();
  const storeSess = c.get('STORE_SESS')?.value;
  const empSess = c.get('EMP_SESS')?.value;

  if (storeSess) await prisma.session.deleteMany({ where: { id: storeSess } });
  if (empSess) await prisma.session.deleteMany({ where: { id: empSess } });

  c.set('STORE_SESS', '', { path: '/', maxAge: 0 });
  c.set('EMP_SESS', '', { path: '/', maxAge: 0 });
  c.set('STORE_PENDING', '', { path: '/', maxAge: 0 });

  return NextResponse.json({ ok: true, next: '/store/login' });
}
