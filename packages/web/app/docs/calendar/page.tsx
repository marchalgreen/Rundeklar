import type { Metadata } from 'next';
import Link from 'next/link';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar module overview | Clairity Docs',
  description:
    'Understand how the Clairity calendar coordinates availability, events, and downstream automation across every surface.',
};

export default function CalendarOverviewPage() {
  return (
    <article className="space-y-8">
      <DocPageHeader
        eyebrow="Calendar"
        title="Calendar Booking Module"
        description="Day/week/month booking surfaces with availability search, event CRUD, drag/resize, and reminder queuing. This documentation is generated from the Calendar Epic and reflects the current code surface."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <p>
          The calendar module is a shared scheduling platform that powers booking from the Clairity
          desktop, embedded widgets, and partner APIs. It understands location hours, chair
          capacity, provider skills, and even lead times on equipment prep so teams can deliver
          predictable care experiences.
        </p>
        <Callout title="Why teams choose Clairity" variant="success">
          <p>
            Clairity coordinates availability across multiple stores, syncs with your retail
            inventory, and exposes a programmable API so operations teams can automate the full
            appointment lifecycle—from discovery to reminders to fulfillment.
          </p>
        </Callout>
        <p>Across the product we rely on three foundational concepts:</p>
        <ul className="list-disc space-y-3 pl-6 text-base">
          <li>
            <strong>Providers</strong> – people or resources that can receive appointments.
            Providers inherit scheduling defaults from their home location but can override hours,
            buffers, and slot sizes.
          </li>
          <li>
            <strong>Events</strong> – the source of truth for appointments, including customer
            details, services, and downstream tasks like handoffs to the lab.
          </li>
          <li>
            <strong>Availability</strong> – generated from templates and real-time signal from
            inventory, provider time off, and historical demand models.
          </li>
        </ul>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Where the calendar appears
        </h3>
        <p>
          Every surface uses the same APIs and data contracts. Designers and developers can reuse
          component primitives regardless of whether the booking starts from a kiosk, a staff
          desktop, or the public site.
        </p>
        <Table
          caption="Primary calendar surfaces"
          columns={[{ header: 'Surface' }, { header: 'Audience' }, { header: 'Highlights' }]}
          rows={[
            [
              <span className="font-medium" key="desktop">
                Desktop calendar
              </span>,
              'Store staff',
              'Drag-and-drop scheduling, same-day capacity view, and checkout integrations.',
            ],
            [
              <span className="font-medium" key="widget">
                Embedded widget
              </span>,
              'Public website',
              'Configurable booking flow with availability search, service selection, and self-check-in.',
            ],
            [
              <span className="font-medium" key="api">
                Partner API
              </span>,
              'External systems',
              'REST API with webhooks for booking orchestration, CRMs, and marketing automations.',
            ],
          ]}
        />
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          System responsibilities
        </h3>
        <p>
          The calendar orchestrates more than just start and end times. It keeps downstream systems
          aligned through event status transitions, reminder workflows, and inventory tasks.
        </p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong>Slot generation</strong> from provider templates, opening hours, and blackout
            rules.
          </li>
          <li>
            <strong>Booking orchestration</strong> that validates conflicts, ensures required
            resources are available, and records the reservation.
          </li>
          <li>
            <strong>Lifecycle automation</strong> such as reminders, follow-up tasks, and analytics
            signals.
          </li>
        </ul>
        <DevToggle
          title="Architecture notes"
          description="How the calendar stays eventually consistent across channels."
        >
          <p>
            Calendar availability is cached per location and recomputed whenever a provider updates
            their schedule, an event is booked, or a blackout window is published. Webhooks emit
            lifecycle events so downstream systems—like lab fulfillment or marketing automation—stay
            synchronized without polling.
          </p>
          <p>
            All writes go through the events service which enforces idempotent tokens on POST
            requests. This ensures marketplace partners cannot accidentally double-book during
            network retries.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          What to read next
        </h3>
        <p>
          Ready to ship? Head to the{' '}
          <Link href="/docs/calendar/quickstart" className="text-sky-600 hover:underline">
            quickstart
          </Link>{' '}
          to provision your sandbox environment and run your first booking mutation.
        </p>
      </section>
    </article>
  );
}
