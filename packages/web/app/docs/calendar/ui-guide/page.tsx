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
    <article className="space-y-8">
      <DocPageHeader
        eyebrow="Calendar"
        title="UI guide"
        description="Design & interaction rules for the calendar surfaces — tokens, grid lines, keyboard, and drag/resize behaviors."
      />
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Tokens & lines</h3>
        <ul className="list-disc pl-5 text-sm text-foreground/85">
          <li>
            Grid background: <code>--grid-bg</code>
          </li>
          <li>
            Hour / half lines: <code>--grid-hour-line</code>, <code>--grid-half-line</code>
          </li>
          <li>
            Hairlines / rings: <code>--line</code> (used via ring-1 classes)
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Keyboard</h3>
        <p className="text-sm text-muted-foreground">
          Arrow keys move time/staff/weekday, Home/End clamp within day, PageUp/Down navigate date,
          Enter opens editor, Esc clears or restores focus.
        </p>
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Create & edit</h3>
        <ul className="list-disc pl-5 text-sm text-foreground/85">
          <li>Click/drag to create a range; default 30 min; snaps to 15 min.</li>
          <li>
            Drag to move; drag edges to resize (min 15 min); cross-staff move in Day view requires
            confirmation.
          </li>
        </ul>
      </section>
    </article>
  );
}
