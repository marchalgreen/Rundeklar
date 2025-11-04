import type { ReactNode } from 'react';
import { getSectionNav } from '@/components/docs/nav';
import UnifiedDocLayout from '@/components/docs/UnifiedDocLayout';

export default function TestingLayout({ children }: { children: ReactNode }) {
  const section = getSectionNav('testing');
  return <UnifiedDocLayout section={section}>{children}</UnifiedDocLayout>;
}
