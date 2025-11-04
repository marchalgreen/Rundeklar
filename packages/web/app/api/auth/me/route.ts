export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPrisma } from '@/lib/db';

export async function GET() {
  const prisma = await getPrisma();
  const c = await cookies();
  const storeSessId = c.get('STORE_SESS')?.value || null;
  const empSessId = c.get('EMP_SESS')?.value || null;

  if (!storeSessId) return NextResponse.json({ ok: false, authed: false });

  const storeSess = await prisma.session.findUnique({ where: { id: storeSessId } });
  if (!storeSess || storeSess.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, authed: false });
  }

  let employee: { id: string; name: string; slug: string } | null = null;
  if (empSessId) {
    const empSess = await prisma.session.findUnique({
      where: { id: empSessId },
      include: { employee: true },
    });
    if (empSess?.employee) {
      employee = {
        id: empSess.employee.id,
        name: empSess.employee.name,
        slug: empSess.employee.slug,
      };
    }
  }

  return NextResponse.json({ ok: true, authed: true, storeId: storeSess.storeId, employee });
}
