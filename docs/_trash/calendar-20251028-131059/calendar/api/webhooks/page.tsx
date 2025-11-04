import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API — Webhooks | Clairity Docs',
  description:
    'Subscribe to calendar lifecycle events and verify webhook signatures for downstream automation.',
};

export default function CalendarWebhooksApiPage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="API"
        title="Webhooks"
        description="Receive real-time notifications when calendar data changes."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          Webhooks allow your integration to react instantly to scheduling events without polling.
          Each workspace can register up to 10 endpoints per environment.
        </p>
        <Table
          caption="Available events"
          columns={[{ header: 'Event' }, { header: 'Description' }]}
          rows={[
            ['booking.created', 'Emitted when a new appointment is created.'],
            ['booking.updated', 'Fires when start time, service, or metadata change.'],
            ['booking.cancelled', 'Sent after an event is cancelled.'],
            ['availability.updated', 'Sent when a provider’s availability recalculates.'],
            ['reminder.failed', 'Raised when a reminder notification fails to send.'],
            ['ics-import.failed', 'Triggered when an ICS sync encounters an error.'],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Register an endpoint
        </h3>
        <p>
          Provide a target URL and at least one subscribed event. Clairity signs each payload with
          an HMAC signature using your webhook secret.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/webhooks" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "url": "https://api.example.com/calendar/webhooks",
    "events": ["booking.created", "booking.updated"],
    "secret": "whsec_123"
  }'`}
        </pre>
        <Callout variant="info" title="Retries">
          <p>
            Clairity retries failed deliveries up to six times using exponential backoff. After the
            final attempt the webhook is marked <em>failed</em> and visible in the admin dashboard.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Validate signatures
        </h3>
        <p>
          Compute an HMAC SHA-256 signature using the webhook secret. Compare against the{' '}
          <code>x-clairity-signature</code>
          header. Reject requests that fail validation.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`import crypto from 'node:crypto';

function verifySignature(body: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}`}
        </pre>
        <DevToggle
          title="Replay protection"
          description="Prevent double-processing of webhook events."
        >
          <p>
            Use the <code>id</code> and <code>deliveredAt</code> fields to deduplicate deliveries.
            Clairity guarantees at-least-once delivery, so storing processed IDs for 24 hours
            prevents double execution.
          </p>
        </DevToggle>
      </section>
    </article>
  );
}
