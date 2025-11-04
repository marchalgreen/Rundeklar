import type { Metadata } from 'next';
import Link from 'next/link';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export const metadata: Metadata = {
  title: 'Calendar UI guide | Clairity Docs',
  description:
    'Design and build consistent scheduling experiences with Clairity’s calendar components and tokens.',
};

export default function CalendarUiGuidePage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="Design"
        title="Calendar UI integration guide"
        description="Compose Clairity calendar primitives to deliver consistent booking experiences across desktop and embedded flows."
      />

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Core layout primitives
        </h3>
        <p>
          Calendar surfaces are composed of three layers: filters, the time grid, and contextual
          side panels. Each layer can be swapped for your use-case but should maintain padding and
          border rhythm to align with the rest of the desktop.
        </p>
        <Table
          caption="Calendar layout building blocks"
          columns={[{ header: 'Primitive' }, { header: 'Description' }, { header: 'Usage tips' }]}
          rows={[
            [
              <span className="font-medium" key="filters">
                <code>&lt;ScheduleFilters&gt;</code>
              </span>,
              'Surface-level controls for location, provider, and service filters.',
              'Keep filters visible on desktop. Collapse into a sheet on small breakpoints.',
            ],
            [
              <span className="font-medium" key="grid">
                <code>&lt;ScheduleGrid&gt;</code>
              </span>,
              'Responsive grid that renders time columns and slot backgrounds.',
              'Use 16px cell gutters and show the “now” marker when current day is visible.',
            ],
            [
              <span className="font-medium" key="panel">
                <code>&lt;AppointmentPanel&gt;</code>
              </span>,
              'Detail drawer that surfaces appointment metadata and actions.',
              'On wide screens keep the panel docked; on mobile use full-height modals.',
            ],
          ]}
        />
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Availability overlays
        </h3>
        <p>
          The calendar grid supports overlays for inventory holds, service prep, and travel buffers.
          Overlays should be translucent with accessible contrast ratios so booked slots remain
          legible.
        </p>
        <Callout variant="warning" title="Respect accessibility ratios">
          <p>
            Overlay colors must maintain a 3:1 contrast ratio against the base grid color. When in
            doubt, use the default theme tokens <code>--calendar-overlay</code> and{' '}
            <code>--calendar-overlay-muted</code>.
          </p>
        </Callout>
        <DevToggle
          title="Implementation detail"
          description="How overlays are rendered in the React calendar package."
        >
          <p>
            Overlays are rendered in a separate canvas layer to avoid reflow when dragging
            appointments. The SDK normalizes overlays into pixel offsets and merges them with slot
            background gradients so animations stay smooth at 60 FPS.
          </p>
        </DevToggle>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Appointment cards
        </h3>
        <p>
          Cards summarize the customer, service, and fulfillment state. Display the appointment
          status badge in the top-left so staff can triage quickly.
        </p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            Use concise titles: <code>Customer • Service</code>. Secondary lines can show notes or
            linked orders.
          </li>
          <li>
            Show icons for reminders, payments, or required forms in the footer to reduce hover
            dependency.
          </li>
          <li>
            For double-bookings render a stacked card with the conflict banner visible at all zoom
            levels.
          </li>
        </ul>
      </section>

      <section className="space-y-6 text-base leading-relaxed">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Empty and loading states
        </h3>
        <p>
          Graceful fallback states keep staff informed while data is loading or filters remove all
          slots. Use skeletons for short loading (&lt; 1s) and animated placeholders for longer
          durations.
        </p>
        <Callout variant="info" title="Localization">
          <p>
            All strings in shared UI components are internationalized through <code>next-intl</code>
            . When you add new empty states, place copy in <code>src/lib/i18n/calendar.ts</code> so
            product marketing can manage translations.
          </p>
        </Callout>
      </section>
    </article>
  );
}
