'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VendorSyncStatusBadge } from '@/components/inventory/VendorSyncStatusBadge';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import { cn } from '@/lib/utils';
import { useVendorSyncRuns } from '@/hooks/useVendorSyncRuns';
import {
  useVendorSyncObservability,
  type VendorSyncObservabilityAggregates,
  type VendorSyncObservabilityStatusFilter,
} from '@/hooks/useVendorSyncObservability';
import type { VendorSyncRun } from '@/hooks/useVendorSyncRuns';

type RunTableError = {
  message: string;
  status?: number;
  detail?: unknown;
} | null;

export type RunTableMeta = {
  source: 'observability' | 'runs';
  aggregates: VendorSyncObservabilityAggregates | null;
  items: VendorSyncRun[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: RunTableError;
  lastUpdated: Date | null;
};

type RunTableProps = {
  vendor: string;
  from?: Date | null;
  to?: Date | null;
  status?: VendorSyncObservabilityStatusFilter[];
  pageSize?: number;
  onRunSelect?: (run: VendorSyncRun) => void;
  onMetaChange?: (meta: RunTableMeta) => void;
  refreshToken?: number;
};

const DEFAULT_PAGE_SIZE = 25;

function mapStatusFilter(value: VendorSyncObservabilityStatusFilter): VendorSyncRun['status'] {
  if (value === 'failed') return 'error';
  return value;
}

function shortHash(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.length <= 10) return value;
  return `${value.slice(0, 10)}…`;
}

function formatDryRun(value: boolean | null | undefined): string {
  if (value == null) return '—';
  return value ? 'Ja' : 'Nej';
}

export default function RunTable({
  vendor,
  from,
  to,
  status,
  pageSize = DEFAULT_PAGE_SIZE,
  onRunSelect,
  onMetaChange,
  refreshToken,
}: RunTableProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const shouldUseObservability = Boolean(vendor && from && to);

  const statusKey = useMemo(() => (status && status.length ? status.slice().sort().join(',') : ''), [status]);
  const rangeKey = useMemo(
    () => `${from ? from.toISOString() : ''}|${to ? to.toISOString() : ''}`,
    [from, to],
  );

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
  }, [vendor, rangeKey, statusKey, shouldUseObservability]);

  const {
    items: observabilityItems,
    aggregates: observabilityAggregates,
    nextCursor,
    refresh: refreshObservability,
    isLoading: observabilityLoading,
    isRefreshing: observabilityRefreshing,
    error: observabilityError,
    lastUpdated: observabilityUpdated,
  } = useVendorSyncObservability({
    vendor,
    from: from ?? null,
    to: to ?? null,
    status,
    pageSize,
    cursor: shouldUseObservability ? cursor : null,
    enabled: shouldUseObservability,
  });

  const {
    runs: fallbackRuns,
    isLoading: fallbackLoading,
    isRefreshing: fallbackRefreshing,
    error: fallbackError,
    refresh: refreshFallback,
    lastUpdated: fallbackUpdated,
  } = useVendorSyncRuns({ vendor, limit: pageSize });

  // Trigger manual refresh when parent updates token
  const refreshTokenRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (refreshToken == null) return;
    if (refreshTokenRef.current == null) {
      refreshTokenRef.current = refreshToken;
      return;
    }
    if (refreshTokenRef.current !== refreshToken) {
      refreshTokenRef.current = refreshToken;
      if (shouldUseObservability) refreshObservability();
      else refreshFallback();
    }
  }, [refreshFallback, refreshObservability, refreshToken, shouldUseObservability]);

  const statusFilterSet = useMemo(() => {
    if (!status || status.length === 0) return null;
    return new Set(status.map(mapStatusFilter));
  }, [status]);

  const { rows, source, loading, refreshing, error, hasMore, metaAggregates, updatedAt } = useMemo(() => {
    if (shouldUseObservability) {
      const filtered = statusFilterSet
        ? observabilityItems.filter((run) => statusFilterSet.has(run.status))
        : observabilityItems;
      return {
        rows: filtered,
        source: 'observability' as const,
        loading: observabilityLoading,
        refreshing: observabilityRefreshing,
        error: observabilityError,
        hasMore: Boolean(observabilityAggregates?.hasMore) && Boolean(nextCursor),
        metaAggregates: observabilityAggregates ?? null,
        updatedAt: observabilityUpdated ?? null,
      };
    }

    const filtered = statusFilterSet
      ? fallbackRuns.filter((run) => statusFilterSet.has(run.status))
      : fallbackRuns;
    return {
      rows: filtered,
      source: 'runs' as const,
      loading: fallbackLoading,
      refreshing: fallbackRefreshing,
      error: fallbackError
        ? { message: fallbackError.message, status: fallbackError.status }
        : null,
      hasMore: false,
      metaAggregates: null,
      updatedAt: fallbackUpdated ?? null,
    };
  }, [
    fallbackError,
    fallbackLoading,
    fallbackRefreshing,
    fallbackRuns,
    fallbackUpdated,
    nextCursor,
    observabilityAggregates,
    observabilityError,
    observabilityItems,
    observabilityLoading,
    observabilityRefreshing,
    observabilityUpdated,
    shouldUseObservability,
    statusFilterSet,
  ]);

  useEffect(() => {
    if (!onMetaChange) return;
    const meta: RunTableMeta = {
      source,
      aggregates: metaAggregates,
      items: rows,
      nextCursor: shouldUseObservability ? nextCursor : null,
      hasMore,
      isLoading: loading,
      isRefreshing: refreshing,
      error,
      lastUpdated: updatedAt,
    };
    onMetaChange(meta);
  }, [error, hasMore, loading, metaAggregates, nextCursor, onMetaChange, refreshing, rows, shouldUseObservability, source, updatedAt]);

  const handleNext = () => {
    if (!shouldUseObservability || !nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor ?? '']);
    setCursor(nextCursor);
  };

  const handlePrev = () => {
    if (!shouldUseObservability) return;
    setCursorHistory((prev) => {
      if (!prev.length) return prev;
      const clone = [...prev];
      const prevCursor = clone.pop() ?? null;
      setCursor(prevCursor && prevCursor.length ? prevCursor : null);
      return clone;
    });
  };

  const hasPrev = cursorHistory.length > 0;

  const showSkeleton = loading && rows.length === 0;
  const showEmpty = !loading && rows.length === 0 && !error;

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive" className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            <AlertTitle>Kunne ikke hente kørsler</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          {loading ? 'Indlæser kørsler…' : `Viser ${rows.length} kørsler`}
          {refreshing ? (
            <span className="ml-2 inline-flex items-center gap-1 text-[hsl(var(--accent-blue))]">
              <Loader2 className="h-3 w-3 animate-spin" /> Opdaterer
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrev || loading}
            className="inline-flex items-center gap-1 rounded-xl border border-white/25 bg-white/60 px-2.5 py-1 font-medium text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60"
          >
            <ChevronLeft className="h-4 w-4" /> Forrige
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!shouldUseObservability || !nextCursor || loading}
            className="inline-flex items-center gap-1 rounded-xl border border-white/25 bg-white/60 px-2.5 py-1 font-medium text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60"
          >
            Næste <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
        <table className="min-w-full divide-y divide-white/20 text-xs dark:divide-white/10">
          <thead className="bg-white/80 text-[0.65rem] uppercase tracking-wide text-muted-foreground dark:bg-[hsl(var(--surface))]/80">
            <tr>
              <th className="px-3 py-3 text-left font-semibold">Startet</th>
              <th className="px-3 py-3 text-left font-semibold">Varighed</th>
              <th className="px-3 py-3 text-left font-semibold">Status</th>
              <th className="px-3 py-3 text-left font-semibold">Dry-run</th>
              <th className="px-3 py-3 text-left font-semibold">Bruger</th>
              <th className="px-3 py-3 text-left font-semibold">Kilde</th>
              <th className="px-3 py-3 text-left font-semibold">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-white/50 dark:divide-white/5 dark:bg-[hsl(var(--surface))]/60">
            {showSkeleton
              ? Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-4">
                        <div className="h-3.5 w-full rounded-full bg-white/80 dark:bg-white/10" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((run) => {
                  const sourceLabel = run.sourcePath ? run.sourcePath.split('/').pop() ?? run.sourcePath : '—';
                  return (
                    <tr
                      key={run.id}
                      className={cn(
                        'transition-colors motion-safe:transition',
                        onRunSelect
                          ? 'cursor-pointer hover:bg-white/90 dark:hover:bg-[hsl(var(--surface))]/75'
                          : 'cursor-default'
                      )}
                      onClick={() => {
                        if (onRunSelect) onRunSelect(run);
                      }}
                    >
                      <td className="px-3 py-3 text-sm text-foreground">{formatVendorSyncDate(run.startedAt)}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{formatVendorSyncDuration(run.durationMs)}</td>
                      <td className="px-3 py-3 text-sm">
                        <VendorSyncStatusBadge status={run.status} />
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{formatDryRun(run.dryRun)}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{run.actor ?? '—'}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        <span className="line-clamp-1" title={run.sourcePath ?? undefined}>
                          {sourceLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{shortHash(run.hash)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {showEmpty ? (
        <div className="rounded-2xl border border-white/20 bg-white/60 p-6 text-center text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
          Ingen kørsler matcher de valgte filtre.
        </div>
      ) : null}
    </div>
  );
}
