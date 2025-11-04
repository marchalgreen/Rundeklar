import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';

export const metadata: Metadata = {
  title: 'Calendar API — ICS import | Clairity Docs',
  description:
    'Ingest legacy calendars and authenticated ICS feeds into Clairity while preserving unique identifiers.',
};

export default function CalendarIcsImportApiPage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="API"
        title="ICS import"
        description="Ingest legacy calendars by pointing Clairity at an authenticated ICS feed."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          ICS importers convert third-party calendars into Clairity events. Imports are
          idempotent—events are matched by UID and automatically updated when the source feed
          changes.
        </p>
        <Callout variant="info" title="Supported feeds">
          <p>
            Clairity supports Google Calendar, Outlook, and custom ICS feeds. For password-protected
            feeds include credentials in the payload and we store them encrypted at rest.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Create an import job
        </h3>
        <p>
          Import jobs sync on a 5-minute cadence. Provide the destination provider and optional
          service mappings to ensure events align with Clairity services.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/ics-imports" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "providerId": "prov_mariam_ravn",
    "url": "https://calendar.example.com/mariam.ics",
    "credentials": {
      "username": "mariam",
      "password": "super-secret"
    },
    "serviceMappings": [
      { "uidPrefix": "CONSULT", "serviceId": "svc_consultation" }
    ]
  }'`}
        </pre>
        <Callout variant="warning" title="Security">
          <p>
            Clairity fetches feeds using static egress IPs. Allow-list <code>34.149.28.114</code>{' '}
            and <code>34.120.45.66</code> if your calendar provider restricts access.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Monitoring</h3>
        <p>
          Each import job emits <code>ics-import.synced</code> and <code>ics-import.failed</code>{' '}
          webhooks. Failed syncs include the last error message so you can alert staff or fall back
          to manual booking.
        </p>
        <DevToggle title="Manual re-sync" description="Trigger a sync outside the normal cadence.">
          <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
            {`curl --request POST "$CALENDAR_BASE_URL/v1/ics-imports/import_job_123/resync" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY"`}
          </pre>
        </DevToggle>
      </section>
    </article>
  );
}
