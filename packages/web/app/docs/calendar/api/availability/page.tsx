import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API — Availability | Clairity Docs',
  description:
    'Publish templates, overrides, and search availability slots through the Clairity calendar API.',
};

export default function CalendarAvailabilityApiPage() {
  return (
    <article className="space-y-6">
      <DocPageHeader
        eyebrow="Calendar"
        title="Availability API"
        description="Return demo staff availability (business hours) used for rendering constraints."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          Availability is returned as normalized slots with metadata for service compatibility and
          overlays. Always request the smallest range required—availability recalculations are
          resource intensive.
        </p>
        <Table
          caption="Endpoints"
          columns={[{ header: 'Method' }, { header: 'Path' }, { header: 'Description' }]}
          rows={[
            ['GET', '/api/calendar/v1/availability', 'Search slots for one or more providers.'],
            [
              'POST',
              '/api/calendar/v1/availability/templates',
              'Create or replace a recurring template.',
            ],
            ['POST', '/api/calendar/v1/availability/overrides', 'Publish single-day overrides.'],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Search availability
        </h3>
        <p>
          Provide either <code>providerIds</code> or <code>serviceIds</code> when querying. The API
          returns slots grouped by provider with overlays for conflicting holds or prep time.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request GET \\
  "$CALENDAR_BASE_URL/v1/availability?locationId=loc_demo_optical&start=2025-03-01&end=2025-03-07&providerIds=prov_mariam_ravn" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY"`}
        </pre>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`{
  "locationId": "loc_demo_optical",
  "range": { "start": "2025-03-01", "end": "2025-03-07" },
  "providers": [
    {
      "providerId": "prov_mariam_ravn",
      "slots": [
        {
          "startsAt": "2025-03-04T09:30:00.000Z",
          "endsAt": "2025-03-04T10:00:00.000Z",
          "serviceIds": ["svc_comprehensive_exam"],
          "capacity": 1,
          "overlays": [
            {
              "type": "inventory_hold",
              "label": "Contact lenses in prep",
              "startsAt": "2025-03-04T08:30:00.000Z",
              "endsAt": "2025-03-04T09:00:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}`}
        </pre>
        <Callout variant="success" title="Slot caching">
          <p>
            Responses are cached for 30 seconds per location and filter combination. If you need
            lower latency updates, subscribe to the <code>availability.updated</code> webhook and
            invalidate your cache selectively.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Templates</h3>
        <p>
          Templates define recurring availability patterns. Posting a template replaces the existing
          configuration starting on the provided <code>effectiveFrom</code> date.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/availability/templates" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "providerId": "prov_mariam_ravn",
    "effectiveFrom": "2025-03-01",
    "rules": [
      { "day": "tue", "open": "09:00", "close": "17:00" },
      { "day": "wed", "open": "09:00", "close": "17:00" },
      { "day": "thu", "open": "11:00", "close": "19:00" },
      { "day": "fri", "open": "09:00", "close": "17:00" }
    ]
  }'`}
        </pre>
        <DevToggle
          title="Partial updates"
          description="How to update a subset of rules without downtime."
        >
          <p>
            Use the <code>patch</code> field to send only the changed days. When <code>patch</code>{' '}
            is true the API merges rules with the existing template and recalculates downstream
            availability.
          </p>
        </DevToggle>
      </section>
    </article>
  );
}
