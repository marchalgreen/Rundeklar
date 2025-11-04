import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar API — Reminders | Clairity Docs',
  description:
    'Configure automated reminder policies, cadences, and message templates for scheduled appointments.',
};

export default function CalendarRemindersApiPage() {
  return (
    <article className="space-y-6">
      <DocPageHeader
        eyebrow="Calendar"
        title="Reminders API"
        description="Queue reminders for an event. Returns a queued entry with timestamp."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          Reminders orchestrate email, SMS, and push notifications for appointment confirmations,
          reminders, and follow-ups. Rules are stored per service or per location.
        </p>
        <Table
          caption="Endpoints"
          columns={[{ header: 'Method' }, { header: 'Path' }, { header: 'Description' }]}
          rows={[
            ['GET', '/api/calendar/v1/reminders', 'List reminder policies for a workspace.'],
            ['POST', '/api/calendar/v1/reminders', 'Create or update a reminder policy.'],
            [
              'POST',
              '/api/calendar/v1/reminders/test',
              'Send a test reminder to verify templates.',
            ],
          ]}
        />
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Policy payload
        </h3>
        <p>
          Each policy defines a <code>target</code> (service or location) and a series of steps.
          Steps run relative to the event start time. The API supports email, SMS, and push
          channels.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/reminders" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\n+  --header "Content-Type: application/json" \\
  --data '{
    "target": { "type": "service", "id": "svc_comprehensive_exam" },
    "timezone": "Europe/Copenhagen",
    "steps": [
      { "offset": "-48h", "channel": "email", "templateId": "tmpl_exam_confirm" },
      { "offset": "-24h", "channel": "sms", "templateId": "tmpl_exam_sms" },
      { "offset": "+2h", "channel": "email", "templateId": "tmpl_follow_up" }
    ]
  }'`}
        </pre>
        <Callout variant="success" title="Template variables">
          <p>
            Templates receive appointment context (customer, provider, location, and service) plus
            any custom metadata stored on the event. Use <code>{'{{customer.firstName}}'}</code>{' '}
            style variables.
          </p>
        </Callout>
      </section>

      <section className="space-y-4 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Testing</h3>
        <p>
          Use the test endpoint to preview rendering before enabling a policy. The API renders
          templates and queues a single delivery to the provided contact.
        </p>
        <pre className="overflow-auto rounded-lg border border-slate-200/70 bg-slate-950 p-4 text-sm text-slate-100 dark:border-slate-800">
          {`curl --request POST "$CALENDAR_BASE_URL/v1/reminders/test" \\
  --header "Authorization: Bearer $CALENDAR_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "policyId": "rem_policy_comprehensive_exam",
    "channel": "email",
    "recipient": {
      "email": "ops@example.com"
    }
  }'`}
        </pre>
        <DevToggle
          title="Channel fallbacks"
          description="How the reminders service handles failures."
        >
          <p>
            When a channel fails (for example SMS send errors) the service retries twice with
            exponential backoff. After failures exhaust, the reminder emits a{' '}
            <code>reminder.failed</code> webhook so you can notify store staff.
          </p>
        </DevToggle>
      </section>
    </article>
  );
}
