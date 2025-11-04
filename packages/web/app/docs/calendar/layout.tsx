import type { ReactNode } from 'react';
import { getSectionNav } from '@/components/docs/nav';
import UnifiedDocLayout from '@/components/docs/UnifiedDocLayout';

export const metadata = {
  title: 'Calendar docs — Clairity',
  description: 'Docs for the Calendar booking module: views, keyboard flows, and API endpoints.',
};

export default function CalendarDocsLayout({ children }: { children: ReactNode }) {
  const section = getSectionNav('calendar'); // drives the left rail
  return <UnifiedDocLayout section={section}>{children}</UnifiedDocLayout>;
}
