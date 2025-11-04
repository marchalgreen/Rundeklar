'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, ListChecks, Wand2 } from 'lucide-react';

import SegmentedPills from '@/components/ui/SegmentedPills';

export type VendorSyncNavProps = {
  active: 'observability' | 'registry' | 'preview-apply';
  className?: string;
};

export default function VendorSyncNav({ active, className }: VendorSyncNavProps) {
  const router = useRouter();

  const handleChange = useCallback(
    (key: string) => {
      if (key === active) return;
      if (key === 'observability') {
        router.push('/vendor-sync');
      } else if (key === 'registry') {
        router.push('/vendor-sync/registry');
      } else if (key === 'preview-apply') {
        router.push('/vendor-sync/vendors');
      }
    },
    [active, router],
  );

  return (
    <SegmentedPills
      className={className}
      value={active}
      onChange={handleChange}
      ariaLabel="Vendor sync visninger"
      items={[
        {
          key: 'observability',
          label: 'Overvågning',
          icon: <BarChart3 className="h-4 w-4" aria-hidden />,
        },
        {
          key: 'registry',
          label: 'Registrering',
          icon: <ListChecks className="h-4 w-4" aria-hidden />,
        },
        {
          key: 'preview-apply',
          label: 'Preview & Apply',
          icon: <Wand2 className="h-4 w-4" aria-hidden />,
        },
      ]}
    />
  );
}
