export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const demoPublic = path.join(process.cwd(), 'public', 'demo', 'moscot.catalog.json');
    const source = isProd ? (process.env.CATALOG_MOSCOT_PATH || demoPublic) : (process.env.CATALOG_MOSCOT_PATH || '/tmp/moscot.catalog.json');
    const buf = await fs.readFile(source, 'utf8');
    const arr = JSON.parse(buf);
    return NextResponse.json({ ok: true, count: Array.isArray(arr) ? arr.length : 0, source });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
