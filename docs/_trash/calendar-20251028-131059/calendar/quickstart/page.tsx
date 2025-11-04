import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar quickstart | Clairity Docs',
  description:
    'Provision environments, publish availability, and book a test appointment with the Clairity calendar API.',
};

export default function CalendarQuickstartPage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="Quickstart"
        title="Launch your first calendar integration"
        description="Provision a sandbox, publish availability, and confirm a booking via API in under 30 minutes."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <Callout variant="info" title="Prerequisites">
          <ul className="list-disc space-y-2 pl-6">
            <li>A Clairity workspace with admin access.</li>
            <li>At least one location with operating hours configured.</li>
            <li>
              An HTTP client such as <code>curl</code> or your preferred REST tooling.
            </li>
          </ul>
        </Callout>
        <p>
          The calendar API follows an environment-per-tenant model. Everything you do in sandbox is
          isolated from production so you can experiment freely without impacting real stores.
        </p>
        <Table
          caption="Environment endpoints"
          columns={[{ header: 'Environment' }, { header: 'Base URL' }, { header: 'Notes' }]}
          rows={[
            [
              'Sandbox',
              'https://sandbox.api.clairity.local/api/calendar',
              'Ephemeral data resets weekly. Great for prototyping.',
            ],
            [
              'Production',
              'https://api.clairity.com/api/calendar',
              'Requires production API credentials and IP allow-listing.',
            ],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          1. Create an API key
        </h3>
        <p>
          From the Clairity admin, navigate to <strong>Developers → API keys</strong> and generate a
          sandbox key with the
          <code>calendar:write</code> and <code>calendar:read</code> scopes. Copy the secret
          value—you will not be able to view it again.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`export CALENDAR_API_KEY="sandbox_xxx";
export CALENDAR_BASE_URL="https://sandbox.api.clairity.local/api/calendar";`}
        </pre>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          2. Register a provider
        </h3>
        <p>
          Providers represent staff or rooms. At minimum you must include a name, location, and
          working hours template. The example below registers an optometrist that works
          Tuesday–Saturday with 30 minute slots.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/providers" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "name": "Dr. Mariam Ravn",
    "locationId": "loc_demo_optical",
    "specialties": ["comprehensive_exam"],
    "slotTemplate": {
      "slotDurationMinutes": 30,
      "weeklyHours": {
        "tue": ["09:00-17:00"],
        "wed": ["09:00-17:00"],
        "thu": ["11:00-19:00"],
        "fri": ["09:00-17:00"],
        "sat": ["09:00-15:00"]
      }
    }
  }'`}
        </pre>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          3. Publish availability
        </h3>
        <p>
          Availability windows describe when a provider can be booked. You can load recurring
          templates or publish ad-hoc overrides for high demand days.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/availability/templates" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "providerId": "prov_mariam_ravn",
    "effectiveFrom": "2025-03-01",
    "rules": [
      { "day": "tue", "open": "09:00", "close": "17:00" },
      { "day": "wed", "open": "09:00", "close": "17:00" },
      { "day": "thu", "open": "11:00", "close": "19:00" },
      { "day": "fri", "open": "09:00", "close": "17:00" },
      { "day": "sat", "open": "09:00", "close": "15:00" }
    ]
  }'`}
        </pre>
        <DevToggle
          title="Need seasonal overrides?"
          description="Push specific days without replacing the template."
        >
          <p>
            Use <code>POST /availability/overrides</code> with concrete <code>date</code> values
            when you need to open late night events or block off staff training. Overrides
            automatically expire once the date has passed.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          4. Book a test appointment
        </h3>
        <p>
          After the provider and availability exist, you can create an event. Use an idempotency key
          so retries are safe.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/events" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --header "Idempotency-Key: demo-booking-001" \\
  --data '{
    "providerId": "prov_mariam_ravn",
    "serviceId": "svc_comprehensive_exam",
    "customer": {
      "name": "Kai Madsen",
      "email": "kai@example.com",
      "phone": "+4588992211"
    },
    "startsAt": "2025-03-04T09:30:00.000Z",
    "durationMinutes": 30,
    "notes": "Prefers contact lens fitting"
  }'`}
        </pre>
        <p>
          You should receive a <code>201 Created</code> response with the persisted event payload.
          The sandbox environment also emits a <code>booking.created</code> webhook you can inspect
          via the developer console.
        </p>
      </section>
    </article>
  );
}
