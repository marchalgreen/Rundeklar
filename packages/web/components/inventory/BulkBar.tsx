'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  count: number;
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
  onLabels?: () => void;
  onClear?: () => void;
};

export default function BulkBar({ count, onExportCsv, onExportXlsx, onLabels, onClear }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-hair bg-white/80 dark:bg-[hsl(var(--surface))]/80 backdrop-blur-md',
        'px-3 py-2 shadow-sm',
        // slide down
        'animate-in slide-in-from-top-2 fade-in-0 duration-200',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-medium">{count}</span> valgt
        </div>
        <div className="flex items-center gap-2">
          {onExportCsv && (
            <Button size="sm" variant="ghost" className="h-7" onClick={onExportCsv}>
              Eksportér CSV
            </Button>
          )}
          {onExportXlsx && (
            <Button size="sm" variant="ghost" className="h-7" onClick={onExportXlsx}>
              Eksportér Excel
            </Button>
          )}
          {onLabels && (
            <Button size="sm" className="h-7" onClick={onLabels}>
              Etiketter ({count})
            </Button>
          )}
          {onClear && (
            <Button size="sm" variant="ghost" className="h-7" onClick={onClear}>
              Ryd markering
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
