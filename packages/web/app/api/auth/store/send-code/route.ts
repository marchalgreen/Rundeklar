// src/app/api/auth/store/send-code/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getPrisma } from '@/lib/db';
import { hash } from '@node-rs/argon2';
import { renderLoginEmail } from '@/lib/email/loginCodeTemplate';

/* -------------------------------------------------------
   Utilities
------------------------------------------------------- */

function randomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function shouldUseTestInbox(host: string): boolean {
  const vercelEnv = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development'
  const force = process.env.FORCE_RESEND_TEST === '1';
  const onVercelSubdomain = /\.vercel\.app$/i.test(host);
  if (process.env.RESEND_TEST_TO) {
    if (force) return true;
    if (vercelEnv && vercelEnv !== 'production') return true;
    if (onVercelSubdomain) return true;
  }
  return false;
}

// scrub any double-origin corruption (from earlier bug)
function fixCorruptedUrls(input: string): string {
  return input
    .replace(/https:\/\/clairity-zeta\.vercel\.app""https(?!")/g, 'https')
    .replace(
      /(['"])https:\/\/clairity-zeta\.vercel\.app\1{2,}/g,
      '$1https://clairity-zeta.vercel.app/'
    )
    .replace(/([^:]\/)\/+/g, '$1');
}

/* -------------------------------------------------------
   Handler
------------------------------------------------------- */

// NOTE: accept Request so we can read an explicit "to" override
export async function POST(req: Request) {
  const prisma = await getPrisma();
  const c = await cookies();
  const hdrs = await headers();
  const host = hdrs.get('host') || '';

  // Optional recipient override from body
  let body: { to?: unknown } = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as { to?: unknown };
    } else {
      body = {};
    }
  } catch {
    body = {};
  }
  const toOverrideRaw = (body?.to ?? '').toString().trim();
  const toOverride = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toOverrideRaw) ? toOverrideRaw : null;

  // Must come from password step
  const raw = c.get('STORE_PENDING')?.value;
  if (!raw) return NextResponse.json({ ok: false, error: 'no_pending' }, { status: 401 });

  let pending: { storeId: string; exp: number } | null = null;
  try {
    pending = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_pending' }, { status: 400 });
  }

  if (!pending?.storeId || !pending?.exp || pending.exp < Date.now()) {
    c.set('STORE_PENDING', '', { maxAge: 0, path: '/' });
    return NextResponse.json({ ok: false, error: 'pending_expired' }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { id: pending.storeId } });
  if (!store) {
    c.set('STORE_PENDING', '', { maxAge: 0, path: '/' });
    return NextResponse.json({ ok: false, error: 'no_store' }, { status: 404 });
  }

  // Generate + persist hashed code into pending cookie
  const code = randomCode();
  const codeHash = await hash(code);
  const nextPending = { ...pending, codeHash, tries: 0, exp: Date.now() + 1000 * 60 * 5 };
  c.set('STORE_PENDING', JSON.stringify(nextPending), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 5,
  });

  const apiKey = process.env.RESEND_API_KEY ?? '';
  const from = process.env.RESEND_FROM || 'Clairity <login@clairity.dk>';

  // Decide recipient:
  // 1) if client provided "to", ALWAYS use that (bypass RESEND_TEST_TO)
  // 2) else if preview/vercel & RESEND_TEST_TO set, use test inbox
  // 3) else fallback to store.email
  let to: string;
  if (toOverride) {
    to = toOverride;
  } else if (shouldUseTestInbox(host) && process.env.RESEND_TEST_TO) {
    to = process.env.RESEND_TEST_TO;
  } else {
    to = store.email;
  }

  if (!apiKey) {
    const debugAllowed = process.env.NODE_ENV !== 'production' || process.env.SEND_DEBUG === '1';
    if (debugAllowed) {
      return NextResponse.json({ ok: true, message: 'Kode (DEV)', devCode: code, to });
    }
    return NextResponse.json({ ok: false, error: 'email_not_configured' }, { status: 500 });
  }

  const cid = `send-code:${Date.now().toString(36)}`;

  try {
    const emailContent = renderLoginEmail({
      code,
      minutesValid: 5,
      brand: { name: 'Clairity' },
    });
    const { subject } = emailContent;
    let html = emailContent.html;
    let text = emailContent.text;

    html = fixCorruptedUrls(html);
    text = fixCorruptedUrls(text);

    // optional debug
    console.log('[EMAIL TO]', to);
    console.log('[EMAIL HTML PREVIEW]', html.substring(0, 240));

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[${cid}] send_failed`, res.status, detail);
      return NextResponse.json({ ok: false, error: 'send_failed', devCode: code }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: 'Kode sendt' });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[${cid}] Resend exception`, e instanceof Error ? e : errorMessage);
    return NextResponse.json(
      { ok: false, error: 'send_exception', devCode: code },
      { status: 500 }
    );
  }
}
