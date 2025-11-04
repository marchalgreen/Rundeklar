import { NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  id: z.string().min(6).max(32),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: 'Ugyldigt ID' }, { status: 400 });
  }

  const { id } = parse.data;

  // Mock: detect CPR-ish (ddmmyy-xxxx) vs generic number and return a pretend lookup
  const isCPR = /^\d{6}-\d{4}$/.test(id);

  const mock = {
    found: id.endsWith('42') ? true : false,
    idType: isCPR ? 'cpr' : 'numeric',
    matchedCustomer: id.endsWith('42')
      ? {
          id: 'cst_lookup_42',
          firstName: 'Clair',
          lastName: 'Ity',
          birthdate: isCPR ? `20${id.slice(4, 6)}-${id.slice(2, 4)}-${id.slice(0, 2)}` : undefined,
          cprMasked: isCPR ? `${id.slice(0, 6)}-xxxx` : undefined,
        }
      : null,
    nextAction: id.endsWith('42') ? 'open_existing' : 'create_new',
  };

  return NextResponse.json(mock);
}
