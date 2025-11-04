'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, ExternalLink, Loader2, RefreshCcw, ServerCrash } from 'lucide-react';

import { useVendorSyncRuns } from '@/hooks/useVendorSyncRuns';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import { getVendorSyncStatusLabel, VendorSyncStatusBadge } from '@/components/inventory/VendorSyncStatusBadge';

type Props = {
  vendor: string;
  vendorLabel?: string;
  limit?: number;
  pollIntervalMs?: number | null;
};

type RunListItem = ReturnType<typeof useVendorSyncRuns>['runs'][number];

type StatProps = {
  label: string;
  value: string | number | null | undefined;
};

function Stat({ label, value }: StatProps) {
  const display =
    value == null || (typeof value === 'number' && Number.isNaN(value))
      ? '—'
      : typeof value === 'number'
      ? new Intl.NumberFormat('da-DK').format(value)
      : value;
  return (
    <div className="rounded-2xl border border-white/20 bg-white/60 p-3 text-xs text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
      <div className="font-medium text-foreground">{display}</div>
      <div className="mt-0.5 text-[0.7rem] uppercase tracking-wide">{label}</div>
    </div>
  );
}

function MetricsGrid({ run }: { run: RunListItem }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat label="Total" value={run.metrics.total} />
      <Stat label="Oprettet" value={run.metrics.created} />
      <Stat label="Opdateret" value={run.metrics.updated} />
      <Stat label="Fjernet" value={run.metrics.removed} />
      <Stat label="Uændret" value={run.metrics.unchanged} />
      <Stat label="Kilde" value={run.sourcePath ? run.sourcePath.split('/').pop() : '—'} />
    </div>
  );
}

export default function VendorSyncObservabilityCard({
  vendor,
  vendorLabel,
  limit = 8,
  pollIntervalMs,
}: Props) {
  const { runs, latestRun, isLoading, isRefreshing, error, refresh, lastUpdated } = useVendorSyncRuns({
    vendor,
    limit,
    pollIntervalMs: pollIntervalMs ?? 60_000,
  });
  const [selectedRun, setSelectedRun] = useState<RunListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displayedRuns = useMemo(() => runs.slice(0, limit), [runs, limit]);
  const handleRowClick = (run: RunListItem) => {
    setSelectedRun(run);
    setDrawerOpen(true);
  };

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    return formatVendorSyncDate(lastUpdated, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastUpdated]);

  const title = vendorLabel ?? vendor;

  return (
    <div className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title} sync-status</h3>
          <p className="text-xs text-muted-foreground">
            Seneste leverandørkørsler, fejl og nøgletal
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastUpdatedLabel ? <span>Opdateret {lastUpdatedLabel}</span> : null}
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-white/60 px-2.5 py-1 font-medium text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:hover:bg-[hsl(var(--surface))]/75"
          >
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Opdater
          </button>
        </div>
      </header>

      <div className="mt-4 space-y-4">
        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--destructive))/0.35] bg-[hsl(var(--destructive))/0.08] p-3 text-sm text-[hsl(var(--destructive))]">
            <ServerCrash className="h-5 w-5" />
            <div>
              <p className="font-medium">Kunne ikke hente synkroniseringsstatus</p>
              <p className="text-xs text-[hsl(var(--destructive))/0.85]">{error.message}</p>
            </div>
          </div>
        ) : null}

        {isLoading && !runs.length ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-14 animate-pulse rounded-xl bg-white/60 dark:bg-[hsl(var(--surface))]/60"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !runs.length && !error ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/60 p-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
            <Clock3 className="h-6 w-6 text-muted-foreground" />
            <p>Ingen synkroniseringskørsler fundet endnu.</p>
          </div>
        ) : null}

        {latestRun ? (
          <section className="rounded-2xl border border-white/20 bg-white/65 p-4 shadow-inner backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/65">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <VendorSyncStatusBadge status={latestRun.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatVendorSyncDate(latestRun.startedAt)} · {formatVendorSyncDuration(latestRun.durationMs)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  Seneste kørsel {latestRun.actor ? `af ${latestRun.actor}` : ''}
                </p>
              </div>
              {latestRun.error ? (
                <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--destructive))/0.35] bg-[hsl(var(--destructive))/0.08] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{latestRun.error}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <MetricsGrid run={latestRun} />
            </div>
          </section>
        ) : null}

        {displayedRuns.length ? (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historik</h4>
            <ul className="mt-2 divide-y divide-white/20 overflow-hidden rounded-xl border border-white/20 dark:divide-white/10 dark:border-white/10">
              {displayedRuns.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(run)}
                    className="flex w-full items-center justify-between gap-3 bg-white/70 px-3 py-3 text-left text-sm transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] dark:bg-[hsl(var(--surface))]/70 dark:hover:bg-[hsl(var(--surface))]/85"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <VendorSyncStatusBadge status={run.status} />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {formatVendorSyncDate(run.startedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Varighed {formatVendorSyncDuration(run.durationMs)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="hidden min-w-[90px] text-right sm:block">
                        {run.metrics.total != null ? `${new Intl.NumberFormat('da-DK').format(run.metrics.total)} varer` : '—'}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedRun(null);
        }}
      >
        <SheetContent className="w-full max-w-md border-l border-white/15 bg-white/95 text-foreground shadow-xl backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/95">
          <SheetHeader>
            <SheetTitle>Detaljer for sync</SheetTitle>
            <SheetDescription>
              {selectedRun
                ? `${title} · ${formatVendorSyncDate(selectedRun.startedAt)} · ${getVendorSyncStatusLabel(selectedRun.status)}`
                : ''}
            </SheetDescription>
          </SheetHeader>
          {selectedRun ? (
            <div className="mt-6 space-y-6 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <VendorSyncStatusBadge status={selectedRun.status} />
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Starttidspunkt</span>
                  <span>{formatVendorSyncDate(selectedRun.startedAt)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Varighed</span>
                  <span>{formatVendorSyncDuration(selectedRun.durationMs)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Kørt af</span>
                  <span>{selectedRun.actor ?? '—'}</span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nøgletal</h5>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Stat label="Total" value={selectedRun.metrics.total} />
                  <Stat label="Oprettet" value={selectedRun.metrics.created} />
                  <Stat label="Opdateret" value={selectedRun.metrics.updated} />
                  <Stat label="Fjernet" value={selectedRun.metrics.removed} />
                  <Stat label="Uændret" value={selectedRun.metrics.unchanged} />
                  <Stat label="Hash" value={selectedRun.hash ?? '—'} />
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Kilde</span>
                  <span className="truncate pl-4 text-right" title={selectedRun.sourcePath ?? undefined}>
                    {selectedRun.sourcePath ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fejl</span>
                  <span className="truncate pl-4 text-right" title={selectedRun.error ?? undefined}>
                    {selectedRun.error ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-sm text-muted-foreground">Vælg en kørsel for at se detaljer.</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

