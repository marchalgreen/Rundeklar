// src/components/inventory/VendorSyncStatusBadge.tsx
'use client';

import { TOKENS } from '@/lib/ui/palette';
import { cn } from '@/lib/utils';

export const VENDOR_SYNC_STATUS_LABELS: Record<string, string> = {
  success: 'Fuldført',
  error: 'Fejlet',
  running: 'Kører',
  pending: 'Afventer',
};

const VENDOR_SYNC_STATUS_STYLES: Record<string, string> = {
  success: 'text-[hsl(var(--success))] bg-[hsl(var(--success))/0.1] border border-[hsl(var(--success))/0.4]',
  error: 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.08] border border-[hsl(var(--destructive))/0.4]',
  running: `text-[hsl(var(${TOKENS.accentBlue}))] bg-[hsl(var(${TOKENS.accentBlue}))/0.1] border border-[hsl(var(${TOKENS.accentBlue}))/0.35]`,
  pending: 'text-muted-foreground bg-white/40 border border-white/50 dark:border-white/20',
};

export type VendorSyncStatus = keyof typeof VENDOR_SYNC_STATUS_LABELS;

type BadgeProps = {
  status: string;
  className?: string;
};

export function getVendorSyncStatusLabel(status: string): string {
  return VENDOR_SYNC_STATUS_LABELS[status] ?? VENDOR_SYNC_STATUS_LABELS.pending;
}

export function VendorSyncStatusBadge({ status, className }: BadgeProps) {
  const key = status in VENDOR_SYNC_STATUS_STYLES ? status : 'pending';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
        VENDOR_SYNC_STATUS_STYLES[key],
        className,
      )}
    >
      {getVendorSyncStatusLabel(key)}
    </span>
  );
}

