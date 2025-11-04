import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API — Events | Clairity Docs',
  description:
    'Create, update, and cancel calendar events with idempotent REST endpoints and webhook signals.',
};

export default function CalendarEventsApiPage() {
  return (
    <article className="space-y-8">
      <DocPageHeader
        eyebrow="Calendar"
        title="Events API"
        description="Create, update, and delete events. This page documents the exact App Router handlers used by the UI."
      />

      {/* Quick curl smoke for local dev */}
      <pre className="overflow-auto rounded-md bg-black/80 p-3 text-[12px] text-white ring-1 ring-[hsl(var(--line)/.12)]">
        {`# POST /api/calendar/events
curl -sX POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Consult","customerId":"c_1","staffId":"s1","start":"2025-01-01T08:00:00.000Z","end":"2025-01-01T08:30:00.000Z","status":"booked","serviceType":"eyeexam","createdBy":"system","updatedBy":"system","createdAt":"2025-01-01T08:00:00.000Z","updatedAt":"2025-01-01T08:00:00.000Z"}' | jq
`}
      </pre>

      <section className="space-y-6 text-base leading-relaxed">
        <Table
          caption="Endpoints"
          columns={[{ header: 'Method' }, { header: 'Path' }, { header: 'Description' }]}
          rows={[
            ['POST', '/api/calendar/v1/events', 'Create a new appointment.'],
            ['GET', '/api/calendar/v1/events/{eventId}', 'Retrieve a single event.'],
            ['PATCH', '/api/calendar/v1/events/{eventId}', 'Update status, timing, or metadata.'],
            [
              'DELETE',
              '/api/calendar/v1/events/{eventId}',
              'Cancel an appointment and free the slot.',
            ],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Create an event</h3>
        <p className="text-[hsl(var(--muted))]">
          Send a <code>POST</code> request with an <code>Idempotency-Key</code> header. When
          successful, the response includes the canonical event payload and a <code>Location</code>{' '}
          header.
        </p>
        <pre className="overflow-auto rounded-md bg-black/80 p-4 text-[12px] text-white ring-1 ring-[hsl(var(--line)/.12)]">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/events" \
  --header "Authorization: Bearer $CALENDAR_API_KEY" \
  --header "Content-Type: application/json" \
  --header "Idempotency-Key: demo-booking-001" \
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
        <Callout variant="success" title="Conflict detection">
          <p>
            The API validates provider availability, required resources, and overlapping
            appointments before committing the event. Conflicts return <code>409</code> responses
            with a pointer to the conflicting reservation.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Update fields</h3>
        <p className="text-[hsl(var(--muted))]">
          Use <code>PATCH</code> to update only the fields that change. You can reschedule, change
          services, or adjust metadata without rebuilding the full payload.
        </p>
        <pre className="overflow-auto rounded-md bg-black/80 p-4 text-[12px] text-white ring-1 ring-[hsl(var(--line)/.12)]">
          {`curl --request PATCH "$CALENDAR_BASE_URL/v1/events/evt_123" \
  --header "Authorization: Bearer $CALENDAR_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "startsAt": "2025-03-04T10:00:00.000Z",
    "durationMinutes": 45,
    "metadata": {
      "leadSource": "retargeting_campaign"
    }
  }'`}
        </pre>
        <DevToggle
          title="Status transitions"
          description="Event states your integration should handle."
        >
          <p className="text-[hsl(var(--foreground))]">
            Events move through <code>scheduled → confirmed → in_progress → completed</code>.
            Cancelled appointments emit <code>booking.cancelled</code> webhooks and release
            associated tasks such as lab orders.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          Cancellation policy
        </h3>
        <p className="text-[hsl(var(--muted))]">
          Deleting an event sends reminder cancellations and frees the slot immediately. Include a{' '}
          <code>reason</code> so staff can analyze trends.
        </p>
        <pre className="overflow-auto rounded-md bg-black/80 p-4 text-[12px] text-white ring-1 ring-[hsl(var(--line)/.12)]">
          {`curl --request DELETE "$CALENDAR_BASE_URL/v1/events/evt_123" \
  --header "Authorization: Bearer $CALENDAR_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{ "reason": "customer_no_show" }'`}
        </pre>
        <Callout variant="warning" title="Retention">
          <p>
            Cancelled events remain queryable for 90 days for reporting. After the retention period
            the payload is anonymized and only aggregate metrics remain available.
          </p>
        </Callout>
      </section>
    </article>
  );
}
