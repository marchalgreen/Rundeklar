'use client';

import { useMemo, useState } from 'react';
import { Clock3, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { vendorLabel } from '@/lib/catalog/vendorSlugs';
import { formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import { useVendorSyncOverview } from '@/hooks/useVendorSyncOverview';

function formatDurationFrom(startedAt: string): string {
  const start = new Date(startedAt);
  if (Number.isNaN(start.valueOf())) return '—';
  const now = Date.now();
  const duration = Math.max(0, now - start.valueOf());
  return formatVendorSyncDuration(duration);
}

export default function QueueSheet() {
  const [open, setOpen] = useState(false);
  const { metrics, isLoading, isRefreshing, error, refresh } = useVendorSyncOverview({
    enabled: open,
    pollIntervalMs: open ? 10_000 : null,
  });

  const runs = metrics.inProgress;

  const summary = useMemo(() => {
    if (!runs.length) return 'Ingen aktive kørsler';
    return `${runs.length} aktive kørsler`;
  }, [runs.length]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-1"
        >
          <Clock3 className="h-4 w-4" /> Kø
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full max-w-md flex-col gap-4 border-l border-white/15 bg-white/95 text-foreground shadow-xl backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/95">
        <SheetHeader>
          <SheetTitle>Sync-kø</SheetTitle>
          <SheetDescription>{summary}</SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {open ? 'Opdateres hvert 10. sekund' : 'Åbn for at opdatere køen'}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              void refresh();
            }}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Opdater nu
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto">
          {!runs.length && !isLoading ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
              Ingen kørsler er i gang.
            </div>
          ) : null}

          {runs.map((run) => {
            const durationLabel = formatDurationFrom(run.startedAt);
            return (
              <div
                key={run.runId}
                className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-foreground">
                  {vendorLabel(run.vendor)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Startet {new Intl.DateTimeFormat('da-DK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(run.startedAt))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                    {run.mode === 'preview' ? 'Preview' : 'Apply'}
                  </span>
                  <span>Varighed: {durationLabel}</span>
                </div>
              </div>
            );
          })}

          {isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground">
              Indlæser kø…
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

