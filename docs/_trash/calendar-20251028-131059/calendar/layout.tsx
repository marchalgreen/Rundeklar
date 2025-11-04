import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getSectionNav } from '@/components/docs/nav';
import UnifiedDocLayout from '@/components/docs/UnifiedDocLayout';

export const metadata: Metadata = {
  title: 'Calendar module documentation | Clairity',
  description:
    'Guides, SDK references, and API specifications for the Clairity calendar platform.',
};

export default function Layout({ children }: { children: ReactNode }) {
  const section = getSectionNav('calendar');

  return <UnifiedDocLayout section={section}>{children}</UnifiedDocLayout>;
}
