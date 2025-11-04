import type { Metadata } from 'next';
import Link from 'next/link';

import DocPageHeader from '@/components/docs/DocPageHeader';
import { Callout } from '@/components/docs/Callout';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API overview | Clairity Docs',
  description:
    'Authentication, rate limits, and error handling details for Clairity’s calendar REST API.',
};

export default function CalendarApiOverviewPage() {
  return (
    <article className="space-y-8">
      <DocPageHeader
        eyebrow="Calendar"
        title="API overview"
        description="Stable, minimal App Router surface for Calendar. All endpoints are live in this app and safe to test locally."
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-2 pr-4">Route</th>
            <th className="py-2 pr-4">Methods</th>
            <th className="py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            <td className="py-1 pr-4">
              <code>/api/calendar/events</code>
            </td>
            <td className="py-1 pr-4">GET, POST</td>
            <td className="py-1">List (stub returns []), create returns body with generated id.</td>
          </tr>
          <tr className="align-top">
            <td className="py-1 pr-4">
              <code>/api/calendar/events/[id]</code>
            </td>
            <td className="py-1 pr-4">PATCH, DELETE</td>
            <td className="py-1">Update or delete a single event; used by drag/resize/editor.</td>
          </tr>
          <tr className="align-top">
            <td className="py-1 pr-4">
              <code>/api/calendar/availability</code>
            </td>
            <td className="py-1 pr-4">GET</td>
            <td className="py-1">Demo staff working hours for rendering constraints.</td>
          </tr>
          <tr className="align-top">
            <td className="py-1 pr-4">
              <code>/api/calendar/reminders</code>
            </td>
            <td className="py-1 pr-4">POST</td>
            <td className="py-1">Queues reminders for an event; returns queued entries.</td>
          </tr>
        </tbody>
      </table>

      <section className="space-y-6 text-base leading-relaxed">
        <p className="text-[hsl(var(--muted))]">
          The calendar API is versioned under <code>/api/calendar/v1</code>. Responses use camelCase
          keys and include ISO-8601 timestamps in UTC. Unless otherwise noted, every write endpoint
          accepts an <code>Idempotency-Key</code> header to guard against duplicate submissions.
        </p>
        <Callout variant="info" title="Authentication">
          <p>
            Use bearer tokens created in the Clairity admin. Production tokens are locked to
            allow-listed IP ranges. For server-to-server automation we recommend storing API keys in
            Clairity Secrets Manager so rotation is automatic.
          </p>
        </Callout>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">HTTP details</h3>
        <Table
          caption="Common headers"
          columns={[{ header: 'Header' }, { header: 'Required' }, { header: 'Purpose' }]}
          rows={[
            [
              <code key="auth">Authorization</code>,
              'Yes',
              'Bearer token that identifies the integration.',
            ],
            [
              <code key="idem">Idempotency-Key</code>,
              'Recommended on POST/PUT',
              'Prevents duplicate bookings when clients retry requests.',
            ],
            [
              <code key="sig">x-clairity-signature</code>,
              'Webhook only',
              'HMAC signature for webhook verification.',
            ],
          ]}
        />
        <p className="text-[hsl(var(--muted))]">
          All responses include a <code>traceId</code> header. Provide it when contacting support so
          we can trace logs and metrics for your calls.
        </p>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Rate limits</h3>
        <p className="text-[hsl(var(--muted))]">
          The calendar API enforces a burst limit of 20 write requests per second and 60 read
          requests per second per workspace. Limits are communicated via response headers.
        </p>
        <Table
          caption="Rate limit headers"
          columns={[{ header: 'Header' }, { header: 'Description' }]}
          rows={[
            [
              <code key="limit">x-ratelimit-limit</code>,
              'Maximum requests allowed in the current window.',
            ],
            [
              <code key="remaining">x-ratelimit-remaining</code>,
              'How many requests you can make before hitting the cap.',
            ],
            [<code key="reset">x-ratelimit-reset</code>, 'Epoch seconds when the window resets.'],
          ]}
        />
        <Callout variant="warning" title="Need higher throughput?">
          <p>
            Contact your Clairity solutions engineer with observed volumes and time windows. We can
            raise limits for batch import jobs or high-volume marketing campaigns.
          </p>
        </Callout>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Error format</h3>
        <p className="text-[hsl(var(--muted))]">
          Errors use the RFC 7807 problem+json format. Validation errors contain a{' '}
          <code>fields</code> map keyed by JSON pointer.
        </p>
        <pre className="overflow-auto rounded-md bg-black/80 p-4 text-[12px] text-white ring-1 ring-[hsl(var(--line)/.12)]">
          {`{
  "type": "https://docs.clairity.com/errors/validation",
  "title": "Invalid appointment request",
  "status": 422,
  "detail": "providerId is not available at the requested time",
  "fields": {
    "/startsAt": "Outside of provider availability"
  },
  "traceId": "45f23e0c6c8d47db"
}`}
        </pre>
        <DevToggle
          title="Handling retries"
          description="When to retry versus surface an error to users."
        >
          <p className="text-[hsl(var(--foreground))]">
            Only retry requests that return HTTP 408, 425, or 5xx responses. If you receive a 409
            conflict, fetch the existing resource via the URL in the <code>Location</code> header.
            For validation errors, prompt the user to adjust their request instead of retrying
            automatically.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Next steps</h3>
        <p className="text-[hsl(var(--muted))]">
          Dive into the endpoint guides for detailed request/response examples, or explore the{' '}
          <Link
            href="/docs/calendar/api/swagger"
            className="underline text-[hsl(var(--accent-blue))]"
          >
            Swagger explorer
          </Link>{' '}
          to try live requests from your browser.
        </p>
      </section>
    </article>
  );
}
