import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar SDK reference | Clairity Docs',
  description:
    'Learn how to use the Clairity calendar SDK for React clients, server automation, and webhook processing.',
};

export default function CalendarSdkPage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="SDK"
        title="Calendar SDK reference"
        description="Use the typed Clairity calendar SDK to integrate scheduling flows without hand-writing HTTP calls."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          The SDK is split into client and server packages so you can bundle only what you need.
          Both packages share the same type definitions generated from the OpenAPI contract.
        </p>
        <Table
          caption="Packages"
          columns={[{ header: 'Package' }, { header: 'Import' }, { header: 'Description' }]}
          rows={[
            [
              <code key="client">@clairity/calendar-client</code>,
              <code key="client-import">{`import { CalendarClient } from '@clairity/calendar-client'`}</code>,
              'Browser-safe helpers for availability search and booking flows. Ships with React hooks.',
            ],
            [
              <code key="server">@clairity/calendar-server</code>,
              <code key="server-import">{`import { CalendarServer } from '@clairity/calendar-server'`}</code>,
              'Node.js client for server-to-server integrations, idempotent writes, and webhooks.',
            ],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Client usage</h3>
        <p>
          Client applications authenticate via short-lived session tokens minted by your backend.
          Tokens scope access to a specific location or provider set so public clients cannot
          enumerate unrelated schedules.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`import { useAvailability } from '@clairity/calendar-client/react';

export function AvailabilityGrid({ locationId, providerIds }) {
  const { data, isLoading } = useAvailability({
    locationId,
    providerIds,
    range: { start: '2025-03-01', end: '2025-03-07' },
  });

  if (isLoading) return <SkeletonGrid />;
  return <ScheduleGrid availability={data.slots} overlays={data.overlays} />;
}`}
        </pre>
        <Callout variant="info" title="Token minting">
          <p>
            Use <code>POST /auth/calendar-tokens</code> from your backend to mint scoped session
            tokens. Tokens expire after 60 minutes and are audience bound to{' '}
            <code>calendar-public</code> clients.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Server usage</h3>
        <p>
          Server integrations typically run from the Clairity desktop or partner middleware. The SDK
          automatically retries idempotent operations with exponential backoff.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`import { CalendarServer } from '@clairity/calendar-server';

const calendar = new CalendarServer({
  baseUrl: process.env.CALENDAR_BASE_URL!,
  apiKey: process.env.CALENDAR_API_KEY!,
});

await calendar.events.create({
  idempotencyKey: 'sync-2025-03-04T09:30',
  providerId: 'prov_mariam_ravn',
  serviceId: 'svc_comprehensive_exam',
  customer: {
    name: 'Kai Madsen',
    email: 'kai@example.com',
    phone: '+4588992211',
  },
  startsAt: '2025-03-04T09:30:00.000Z',
  durationMinutes: 30,
});`}
        </pre>
        <DevToggle title="Automatic retries" description="How the SDK evaluates retry eligibility.">
          <p>
            The server client inspects the <code>Idempotency-Key</code> header and only retries
            requests that either time out or return a <code>409</code> with a retry token. Fatal
            validation errors surface immediately so you can alert operators.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Webhook helpers
        </h3>
        <p>
          Use the webhook verifier to validate signatures before processing events. It accepts the
          raw request body and the
          <code>x-clairity-signature</code> header.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`import { verifyWebhookSignature } from '@clairity/calendar-server/webhooks';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-clairity-signature') ?? '';

  verifyWebhookSignature({
    payload: rawBody,
    signature,
    secret: process.env.CALENDAR_WEBHOOK_SECRET!,
  });

  const event = JSON.parse(rawBody);
  // handle event.type === 'booking.created'
}`}
        </pre>
        <Callout variant="success" title="Tip">
          <p>
            Pair the verifier with <code>calendar.events.get()</code> to fetch the latest state
            after processing a webhook. This keeps your integration resilient to out-of-order
            deliveries.
          </p>
        </Callout>
      </section>
    </article>
  );
}
