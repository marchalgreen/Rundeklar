// src/app/api/email/pr/route.ts
import { NextResponse } from 'next/server';
import { purchaseRequestToCsv } from '@/lib/export/prCsv';

type DraftLine = {
  itemId?: string | null;
  sku: string;
  name: string;
  qty: number;
  supplierHint?: string | null;
};

type DraftPayload = {
  id: string;
  label: string;
  supplierHint?: string | null;
  contactEmail?: string | null;
  note?: string | null;
  lines: DraftLine[];
};

function sanitizeFilename(label: string) {
  const safe = label.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
  return safe || 'purchase-request';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { draft?: DraftPayload } | null;
    const draft = body?.draft;

    if (!draft) {
      return NextResponse.json({ error: 'Missing draft payload' }, { status: 400 });
    }

    const email = draft.contactEmail?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Missing contact email' }, { status: 400 });
    }

    if (!Array.isArray(draft.lines) || draft.lines.length === 0) {
      return NextResponse.json({ error: 'Draft has no lines' }, { status: 400 });
    }

    const csv = purchaseRequestToCsv({
      supplierHint: draft.supplierHint ?? null,
      lines: draft.lines.map((line) => ({
        sku: line.sku,
        name: line.name,
        qty: line.qty,
        supplierHint: line.supplierHint ?? null,
      })),
    });

    const subject = `Purchase Request: ${draft.label}`;
    const summary = draft.lines
      .map((line) => `${line.qty} × ${line.sku} — ${line.name}`)
      .join('<br/>');
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[email:pr] RESEND_API_KEY missing – skipping send (demo mode).');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const from = process.env.RESEND_FROM || 'Clairity <noreply@clairity.app>';
    const payload = {
      from,
      to: email,
      subject,
      html: `
        <p>Hej,</p>
        <p>Vedhæftet finder du vores indkøbsanmodning.</p>
        ${draft.supplierHint ? `<p>Leverandør: <strong>${draft.supplierHint}</strong></p>` : ''}
        ${draft.note ? `<p><em>${draft.note}</em></p>` : ''}
        <p><strong>Linjer:</strong><br/>${summary}</p>
        <p>--<br/>Clairity demo</p>
      `,
      attachments: [
        {
          filename: `${sanitizeFilename(draft.label)}.csv`,
          content: Buffer.from(csv, 'utf8').toString('base64'),
        },
      ],
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[email:pr] send_failed', response.status, detail);
      return NextResponse.json({ error: 'send_failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error('[email:pr] Failed to send email', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
