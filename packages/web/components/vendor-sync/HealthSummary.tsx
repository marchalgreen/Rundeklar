'use client';

import { useMemo } from 'react';
import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import {
  type OverviewMetrics,
  useVendorSyncOverview,
} from '@/hooks/useVendorSyncOverview';

type HealthSummaryContentProps = {
  metrics: OverviewMetrics;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh?: () => void;
  updatedAt?: Date | null;
  className?: string;
};

type CardConfig = {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'destructive' | 'muted';
};

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('da-DK').format(value);
}

function formatAverage(duration: number | null | undefined): string {
  if (duration == null || !Number.isFinite(duration)) return '—';
  return formatVendorSyncDuration(duration);
}

function SummaryCard({ label, value, tone = 'default' }: CardConfig) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-300'
      : tone === 'destructive'
        ? 'text-destructive'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground';

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold', toneClass)}>{value}</span>
    </div>
  );
}

export function HealthSummaryContent({
  metrics,
  loading,
  refreshing,
  error,
  onRefresh,
  updatedAt,
  className,
}: HealthSummaryContentProps) {
  const cards = useMemo<CardConfig[]>(() => {
    const last24h = metrics.last24h;
    return [
      {
        label: 'Succes (24t)',
        value: formatNumber(last24h?.success ?? null),
        tone: 'success',
      },
      {
        label: 'Fejl (24t)',
        value: formatNumber(last24h?.failed ?? null),
        tone: last24h?.failed ? 'destructive' : 'muted',
      },
      {
        label: 'I gang',
        value: formatNumber(metrics.inProgress.length),
        tone: metrics.inProgress.length > 0 ? 'default' : 'muted',
      },
      {
        label: 'Gns. varighed',
        value: formatAverage(last24h?.avgDurationMs ?? null),
        tone: 'default',
      },
    ];
  }, [metrics]);

  const totalLabel = useMemo(() => {
    const total = metrics.last24h?.total ?? null;
    if (total == null || Number.isNaN(total)) return '—';
    return formatNumber(total);
  }, [metrics.last24h?.total]);

  const updatedLabel = useMemo(() => {
    if (!updatedAt) return null;
    return new Intl.DateTimeFormat('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(updatedAt);
  }, [updatedAt]);

  return (
    <section
      className={cn(
        'rounded-3xl border border-white/20 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Driftsstatus</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Henter seneste nøgletal…' : `Seneste 24 timer · ${totalLabel} kørsler`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {updatedLabel ? <span>Opdateret {updatedLabel}</span> : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1 rounded-xl border border-white/40 bg-white/70 px-2.5 py-1 font-medium text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:hover:bg-[hsl(var(--surface))]/75"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Opdater
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}

type HealthSummaryProps = {
  className?: string;
};

export default function HealthSummary({ className }: HealthSummaryProps) {
  const { metrics, isLoading, isRefreshing, error, refresh, lastUpdated } = useVendorSyncOverview({
    pollIntervalMs: 60_000,
  });

  return (
    <HealthSummaryContent
      className={className}
      metrics={metrics}
      loading={isLoading}
      refreshing={isRefreshing}
      error={error?.message ?? null}
      onRefresh={refresh}
      updatedAt={lastUpdated ?? undefined}
    />
  );
}

export type { HealthSummaryContentProps };

