import type { Metadata } from 'next';
import Link from 'next/link';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API overview | Clairity Docs',
  description:
    'Authentication, rate limits, and error handling details for Clairity’s calendar REST API.',
};

export default function CalendarApiOverviewPage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="API"
        title="Calendar API overview"
        description="All calendar endpoints follow JSON-over-HTTP semantics with strong typing and idempotent writes."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
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
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">HTTP details</h3>
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
        <p>
          All responses include a <code>traceId</code> header. Provide it when contacting support so
          we can trace logs and metrics for your calls.
        </p>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Rate limits</h3>
        <p>
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
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Error format</h3>
        <p>
          Errors use the RFC 7807 problem+json format. Validation errors contain a{' '}
          <code>fields</code> map keyed by JSON pointer.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
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
          <p>
            Only retry requests that return HTTP 408, 425, or 5xx responses. If you receive a 409
            conflict, fetch the existing resource via the URL in the <code>Location</code> header.
            For validation errors, prompt the user to adjust their request instead of retrying
            automatically.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Next steps</h3>
        <p>
          Dive into the endpoint guides for detailed request/response examples, or explore the
          <Link href="/docs/calendar/api/swagger" className="text-sky-600 hover:underline">
            {' '}
            Swagger explorer
          </Link>{' '}
          to try live requests from your browser.
        </p>
      </section>
    </article>
  );
}
