import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getSectionNav } from '@/components/docs/nav';
import UnifiedDocLayout from '@/components/docs/UnifiedDocLayout';

export const metadata: Metadata = {
  title: 'Vendor Sync documentation — Clairity',
  description:
    'Integrated playbook for Clairity Vendor Sync — operations workflows with inline developer guidance and API reference.',
};

export default function Layout({ children }: { children: ReactNode }) {
  const section = getSectionNav('vendor-sync');

  return <UnifiedDocLayout section={section}>{children}</UnifiedDocLayout>;
}
