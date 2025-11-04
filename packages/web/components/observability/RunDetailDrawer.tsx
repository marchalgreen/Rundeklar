'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VendorSyncStatusBadge } from '@/components/inventory/VendorSyncStatusBadge';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import type { VendorSyncRun } from '@/hooks/useVendorSyncRuns';
import { AlertTriangle } from 'lucide-react';

function formatMetric(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('da-DK').format(value);
}

function formatDryRun(value: boolean | null | undefined): string {
  if (value == null) return '—';
  return value ? 'Ja' : 'Nej';
}

type RunDetailDrawerProps = {
  open: boolean;
  run?: VendorSyncRun | null;
  onOpenChange: (next: boolean) => void;
};

export default function RunDetailDrawer({ open, run, onOpenChange }: RunDetailDrawerProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <SheetContent className="w-full max-w-lg border-l border-white/15 bg-white/95 text-foreground shadow-xl backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/95">
        <SheetHeader>
          <SheetTitle>Detaljer for synkronisering</SheetTitle>
          <SheetDescription>
            {run ? `${run.vendor} · ${formatVendorSyncDate(run.startedAt)}` : 'Vælg en kørsel for at se detaljer'}
          </SheetDescription>
        </SheetHeader>

        {!run ? (
          <div className="mt-6 text-sm text-muted-foreground">
            Ingen kørsel valgt.
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-sm">
            <section className="space-y-3">
              <div className="flex flex-col gap-2">
                <VendorSyncStatusBadge status={run.status} />
                <div className="text-muted-foreground">
                  <div>Startet: {formatVendorSyncDate(run.startedAt)}</div>
                  <div>Varighed: {formatVendorSyncDuration(run.durationMs)}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide">Dry-run</span>
                  <p className="mt-1 text-foreground">{formatDryRun(run.dryRun)}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide">Bruger</span>
                  <p className="mt-1 text-foreground">{run.actor ?? '—'}</p>
                </div>
              </div>
            </section>

            <section className="space-y-2 text-muted-foreground">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide">Kilde</span>
                <p className="mt-1 break-all text-foreground" title={run.sourcePath ?? undefined}>
                  {run.sourcePath ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide">Hash</span>
                <p className="mt-1 break-all text-foreground">{run.hash ?? '—'}</p>
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nøgletal</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/25 bg-white/60 p-3 text-xs text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
                  <div className="font-semibold text-foreground">{formatMetric(run.metrics.total)}</div>
                  <div className="mt-1 uppercase tracking-wide">Total</div>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/60 p-3 text-xs text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
                  <div className="font-semibold text-foreground">{formatMetric(run.metrics.created)}</div>
                  <div className="mt-1 uppercase tracking-wide">Oprettet</div>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/60 p-3 text-xs text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
                  <div className="font-semibold text-foreground">{formatMetric(run.metrics.updated)}</div>
                  <div className="mt-1 uppercase tracking-wide">Opdateret</div>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/60 p-3 text-xs text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
                  <div className="font-semibold text-foreground">{formatMetric(run.metrics.removed)}</div>
                  <div className="mt-1 uppercase tracking-wide">Fjernet</div>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/60 p-3 text-xs text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
                  <div className="font-semibold text-foreground">{formatMetric(run.metrics.unchanged)}</div>
                  <div className="mt-1 uppercase tracking-wide">Uændret</div>
                </div>
              </div>
            </section>

            {run.status === 'error' && run.error ? (
              <Alert variant="destructive" className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <AlertTitle>Fejlbesked</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap break-words">
                    {run.error}
                  </AlertDescription>
                </div>
              </Alert>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
