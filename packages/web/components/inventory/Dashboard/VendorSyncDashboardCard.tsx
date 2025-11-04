// src/components/inventory/Dashboard/VendorSyncDashboardCard.tsx
'use client';

import { useMemo } from 'react';
import { AlertTriangle, Loader2, RefreshCcw, ServerCrash } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import { useVendorSyncState } from '@/hooks/useVendorSyncState';
import { getVendorSyncStatusLabel, VendorSyncStatusBadge } from '@/components/inventory/VendorSyncStatusBadge';

type Props = {
  vendor: string;
  vendorLabel?: string;
  pollIntervalMs?: number | null;
  className?: string;
};

type StatProps = {
  label: string;
  value: string | number | null | undefined;
  title?: string;
};

function Stat({ label, value, title }: StatProps) {
  const display =
    value == null || (typeof value === 'number' && Number.isNaN(value))
      ? '—'
      : typeof value === 'number'
        ? new Intl.NumberFormat('da-DK').format(value)
        : value;

  return (
    <div
      className="rounded-xl border border-white/25 bg-white/65 p-3 text-xs text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/65"
      title={title}
    >
      <div className="font-medium text-foreground truncate" title={typeof display === 'string' ? display : undefined}>
        {display}
      </div>
      <div className="mt-0.5 text-[0.7rem] uppercase tracking-wide">{label}</div>
    </div>
  );
}

export default function VendorSyncDashboardCard({
  vendor,
  vendorLabel,
  pollIntervalMs = 120_000,
  className,
}: Props) {
  const { snapshot, isLoading, isRefreshing, error, refresh, lastUpdated } = useVendorSyncState({
    vendor,
    pollIntervalMs,
  });

  const status = useMemo(() => {
    if (snapshot?.lastError) return 'error';
    if (snapshot?.lastRunAt) return 'success';
    return 'pending';
  }, [snapshot]);

  const title = vendorLabel ?? vendor;

  const lastRunLabel = useMemo(() => formatVendorSyncDate(snapshot?.lastRunAt), [snapshot?.lastRunAt]);
  const durationLabel = useMemo(
    () => formatVendorSyncDuration(snapshot?.lastDurationMs),
    [snapshot?.lastDurationMs],
  );
  const sourceName = useMemo(() => {
    if (!snapshot?.lastSource) return '—';
    const parts = snapshot.lastSource.split(/[\\/]/);
    return parts[parts.length - 1] || snapshot.lastSource;
  }, [snapshot?.lastSource]);
  const hashShort = useMemo(() => {
    if (!snapshot?.lastHash) return '—';
    if (snapshot.lastHash.length <= 10) return snapshot.lastHash;
    return `${snapshot.lastHash.slice(0, 10)}…`;
  }, [snapshot?.lastHash]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    return formatVendorSyncDate(lastUpdated, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastUpdated]);

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Leverandør sync</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">Overblik over seneste katalogimport.</p>
        </div>
        <div className="flex items-center gap-2">
          <VendorSyncStatusBadge status={status} />
          <span className="sr-only">Status: {getVendorSyncStatusLabel(status)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--destructive))/0.35] bg-[hsl(var(--destructive))/0.08] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
            <ServerCrash className="h-4 w-4" />
            <div>
              <p className="font-medium">Kunne ikke hente sync-data</p>
              <p className="text-[0.7rem] text-[hsl(var(--destructive))/0.85]">{error.message}</p>
            </div>
          </div>
        ) : null}

        {snapshot?.lastError ? (
          <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--destructive))/0.35] bg-[hsl(var(--destructive))/0.08] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
            <AlertTriangle className="h-4 w-4" />
            <span>{snapshot.lastError}</span>
          </div>
        ) : null}

        {isLoading && !snapshot ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 animate-pulse rounded-xl bg-white/60 dark:bg-[hsl(var(--surface))]/60" />
            ))}
          </div>
        ) : null}

        {!isLoading && !snapshot && !error ? (
          <div className="rounded-xl border border-white/25 bg-white/65 p-4 text-sm text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/65">
            Ingen synkroniseringskørsler er registreret endnu.
          </div>
        ) : null}

        {snapshot ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Seneste kørsel" value={lastRunLabel} />
            <Stat label="Varighed" value={durationLabel} />
            <Stat label="Kørt af" value={snapshot.lastRunBy ?? '—'} />
            <Stat label="Total" value={snapshot.totalItems} />
            <Stat label="Kilde" value={sourceName} title={snapshot.lastSource ?? undefined} />
            <Stat label="Hash" value={hashShort} title={snapshot.lastHash ?? undefined} />
          </div>
        ) : null}
      </div>

      <footer className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>{lastUpdatedLabel ? `Opdateret ${lastUpdatedLabel}` : 'Ikke opdateret endnu.'}</div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center gap-1 self-start rounded-xl border border-white/30 bg-white/60 px-2.5 py-1 font-medium text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:hover:bg-[hsl(var(--surface))]/75"
        >
          {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          Opdater
        </button>
      </footer>
    </div>
  );
}

