import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API — Providers | Clairity Docs',
  description:
    'Manage provider profiles, scheduling templates, and storefront routing using the Clairity calendar API.',
};

export default function CalendarProvidersApiPage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="API"
        title="Providers endpoints"
        description="Manage staff, rooms, and other schedulable resources."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          Providers are the backbone of availability generation. Each provider belongs to a
          location, can own multiple specialties, and may have unique schedule templates.
        </p>
        <Table
          caption="Endpoints"
          columns={[{ header: 'Method' }, { header: 'Path' }, { header: 'Description' }]}
          rows={[
            ['GET', '/api/calendar/v1/providers', 'List providers for a workspace.'],
            ['POST', '/api/calendar/v1/providers', 'Create a provider.'],
            [
              'PATCH',
              '/api/calendar/v1/providers/{providerId}',
              'Update profile details or scheduling settings.',
            ],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Provider payload
        </h3>
        <p>
          The minimum fields are <code>name</code>, <code>locationId</code>, and a{' '}
          <code>slotTemplate</code>. Use metadata to store integration identifiers or operational
          notes.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/providers" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "name": "Dr. Mariam Ravn",
    "locationId": "loc_demo_optical",
    "email": "mariam.ravn@example.com",
    "phone": "+4588992200",
    "specialties": ["comprehensive_exam"],
    "slotTemplate": {
      "slotDurationMinutes": 30,
      "bufferBeforeMinutes": 5,
      "bufferAfterMinutes": 5,
      "weeklyHours": {
        "tue": ["09:00-17:00"],
        "wed": ["09:00-17:00"],
        "thu": ["11:00-19:00"],
        "fri": ["09:00-17:00"],
        "sat": ["09:00-15:00"]
      }
    },
    "metadata": {
      "npi": "1234567890"
    }
  }'`}
        </pre>
        <Callout variant="note" title="Rooms and equipment">
          <p>
            Create non-staff providers for special rooms or devices (for example retinal imaging).
            Associate them with services to ensure the calendar reserves the right resources when
            booking.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Soft deletes</h3>
        <p>
          Providers can be archived instead of deleted. Archived providers stop generating slots but
          remain available for historical reporting.
        </p>
        <DevToggle
          title="Archiving a provider"
          description="Send a PATCH request to toggle archival state."
        >
          <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
            {`curl --request PATCH "$CALENDAR_BASE_URL/v1/providers/prov_mariam_ravn" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{ "archived": true }'`}
          </pre>
        </DevToggle>
      </section>
    </article>
  );
}
