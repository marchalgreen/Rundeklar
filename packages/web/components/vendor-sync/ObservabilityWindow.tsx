'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2 } from 'lucide-react';
import { ArrowsClockwise, CheckCircle, XCircle } from '@phosphor-icons/react';

import RunFilters from '@/components/observability/RunFilters';
import RunTable, { type RunTableMeta } from '@/components/observability/RunTable';
import RunDetailDrawer from '@/components/observability/RunDetailDrawer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatVendorSyncDate } from '@/lib/catalog/vendorSyncFormatting';
import type { VendorSyncRun } from '@/hooks/useVendorSyncRuns';
import type { VendorSyncObservabilityStatusFilter } from '@/hooks/useVendorSyncObservability';
import { DEFAULT_VENDOR_SLUG, vendorLabel as getVendorLabel } from '@/lib/catalog/vendorSlugs';
import HealthSummary from '@/components/vendor-sync/HealthSummary';
import TrendBlocks from '@/components/vendor-sync/TrendBlocks';
import QueueSheet from '@/components/vendor-sync/QueueSheet';

const DATE_LABEL = new Intl.DateTimeFormat('da-DK', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_PAGE_SIZE = 25;

type Props = {
  vendorId: string;
  vendorLabel?: string;
  limit?: number;
};

type StatProps = {
  label: string;
  value: string | number | null | undefined;
  tone?: 'default' | 'success' | 'destructive';
};

function startOfDayUTC(date: Date) {
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function endOfDayUTC(date: Date) {
  const clone = new Date(date);
  clone.setUTCHours(23, 59, 59, 999);
  return clone;
}

function createDefaultRange(days: number) {
  const today = new Date();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from, to } as const;
}

function Stat({ label, value, tone = 'default' }: StatProps) {
  const display =
    value == null || (typeof value === 'number' && Number.isNaN(value))
      ? '—'
      : typeof value === 'number'
      ? new Intl.NumberFormat('da-DK').format(value)
      : value;
  const toneClass =
    tone === 'success'
      ? 'text-[hsl(var(--success))]'
      : tone === 'destructive'
      ? 'text-[hsl(var(--destructive))]'
      : 'text-foreground';

  return (
    <div className="rounded-2xl border border-[hsl(var(--line))] bg-white/70 p-3 shadow-sm backdrop-blur transition dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
      <div className={`text-sm font-semibold ${toneClass}`}>{display}</div>
      <div className="mt-0.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function extractFieldErrors(detail: unknown): string[] {
  if (!detail) return [];
  if (typeof detail === 'string') return [detail];
  if (typeof detail !== 'object') return [];

  const result: string[] = [];
  const maybeRecord = detail as Record<string, unknown>;
  if (Array.isArray(maybeRecord.formErrors)) {
    for (const item of maybeRecord.formErrors) {
      if (typeof item === 'string' && item.trim().length) result.push(item);
    }
  }
  if (maybeRecord.fieldErrors && typeof maybeRecord.fieldErrors === 'object') {
    const fieldErrors = maybeRecord.fieldErrors as Record<string, unknown>;
    for (const value of Object.values(fieldErrors)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === 'string' && entry.trim().length) {
            result.push(entry);
          }
        }
      }
    }
  }
  return result;
}

export default function ObservabilityWindow({ vendorId, vendorLabel, limit }: Props) {
  const { from: defaultFrom, to: defaultTo } = useMemo(
    () => createDefaultRange(DEFAULT_WINDOW_DAYS),
    [],
  );
  const [vendor, setVendor] = useState<string>(vendorId || DEFAULT_VENDOR_SLUG);
  const [from, setFrom] = useState<Date | null>(defaultFrom);
  const [to, setTo] = useState<Date | null>(defaultTo);
  const [statusFilters, setStatusFilters] = useState<VendorSyncObservabilityStatusFilter[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedRun, setSelectedRun] = useState<VendorSyncRun | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tableMeta, setTableMeta] = useState<RunTableMeta | null>(null);

  const validationError = useMemo(() => {
    if (!from || !to) return null;
    if (from.valueOf() > to.valueOf()) {
      return 'Startdato skal være før slutdato.';
    }
    return null;
  }, [from, to]);

  useEffect(() => {
    if (validationError) {
      setTableMeta(null);
    }
  }, [validationError]);

  const effectiveFrom = validationError ? null : from;
  const effectiveTo = validationError ? null : to;

  const queryFrom = useMemo(
    () => (effectiveFrom ? startOfDayUTC(effectiveFrom) : null),
    [effectiveFrom],
  );
  const queryTo = useMemo(() => (effectiveTo ? endOfDayUTC(effectiveTo) : null), [effectiveTo]);

  const vendorOptions = useMemo(() => {
    const entries = new Map<string, string>();
    entries.set(DEFAULT_VENDOR_SLUG, getVendorLabel(DEFAULT_VENDOR_SLUG));
    if (vendorId) entries.set(vendorId, vendorLabel ?? getVendorLabel(vendorId));
    return Array.from(entries.entries()).map(([value, label]) => ({ value, label }));
  }, [vendorId, vendorLabel]);

  const lastUpdatedLabel = useMemo(() => {
    if (validationError || !tableMeta?.lastUpdated) return null;
    return formatVendorSyncDate(tableMeta.lastUpdated, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [tableMeta?.lastUpdated, validationError]);

  const counts = useMemo(() => {
    if (tableMeta?.aggregates) return tableMeta.aggregates.counts;
    const base = { success: 0, error: 0, running: 0 };
    for (const run of tableMeta?.items ?? []) {
      if (run.status === 'success') base.success += 1;
      else if (run.status === 'error') base.error += 1;
      else if (run.status === 'running') base.running += 1;
    }
    return base;
  }, [tableMeta]);

  const totalRuns = tableMeta?.aggregates?.totalRuns ?? tableMeta?.items.length ?? 0;
  const latestRunLabel = useMemo(() => {
    if (tableMeta?.aggregates?.latestRunAt) {
      return formatVendorSyncDate(tableMeta.aggregates.latestRunAt);
    }
    const first = tableMeta?.items?.[0];
    return first ? formatVendorSyncDate(first.startedAt) : '—';
  }, [tableMeta]);

  const pageSize = limit ?? DEFAULT_PAGE_SIZE;

  const fieldErrors = useMemo(
    () => extractFieldErrors(tableMeta?.error?.detail),
    [tableMeta?.error?.detail],
  );

  const windowLabel =
    effectiveFrom && effectiveTo
      ? `${DATE_LABEL.format(effectiveFrom)} – ${DATE_LABEL.format(effectiveTo)}`
      : 'Alle perioder';

  const showStatsSkeleton =
    !validationError && (!tableMeta || (tableMeta.isLoading && tableMeta.items.length === 0));

  const handleRefresh = () => {
    setRefreshToken((token) => token + 1);
  };

  const handleReset = () => {
    const defaults = createDefaultRange(DEFAULT_WINDOW_DAYS);
    setVendor(vendorId || DEFAULT_VENDOR_SLUG);
    setFrom(defaults.from);
    setTo(defaults.to);
    setStatusFilters([]);
    setSelectedRun(null);
    setDrawerOpen(false);
    setTableMeta(null);
    setRefreshToken((token) => token + 1);
  };

  const handleFiltersChange = (next: {
    vendor: string;
    from: Date | null;
    to: Date | null;
    status: VendorSyncObservabilityStatusFilter[];
  }) => {
    setVendor(next.vendor);
    setFrom(next.from);
    setTo(next.to);
    setStatusFilters(next.status);
    setSelectedRun(null);
    setDrawerOpen(false);
    setTableMeta(null);
  };

  const handleRunSelect = (run: VendorSyncRun) => {
    setSelectedRun(run);
    setDrawerOpen(true);
  };

  const handleMetaChange = useCallback((meta: RunTableMeta) => {
    setTableMeta(meta);
  }, []);

  return (
    <section className="rounded-3xl border border-white/20 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
      <div className="space-y-4">
        <HealthSummary />
        <TrendBlocks limit={8} />
      </div>

      <div className="my-6 h-px w-full bg-border/60" aria-hidden />

      <div className="rounded-2xl border border-[hsl(var(--line))] bg-white/70 p-4 shadow-sm backdrop-blur">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {vendorLabel ?? `${getVendorLabel(vendorId || DEFAULT_VENDOR_SLUG)} observability`}
            </h2>
            <p className="text-xs text-muted-foreground">
              Overvågning af seneste synkroniseringskørsler
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-muted-foreground">
              {windowLabel}
            </span>
            {lastUpdatedLabel ? (
              <span className="text-muted-foreground">Opdateret {lastUpdatedLabel}</span>
            ) : null}
            <Button
              type="button"
              variant="soft"
              size="pill"
              onClick={handleRefresh}
              disabled={Boolean(validationError) || tableMeta?.isLoading || tableMeta?.isRefreshing}
            >
              {tableMeta?.isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowsClockwise size={18} weight="bold" />
              )}
              Opdater
            </Button>
            <Button type="button" variant="soft" size="pill" onClick={handleReset}>
              <BarChart3 className="h-4 w-4" /> Sidste 7 dage
            </Button>
            <QueueSheet />
          </div>
        </header>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="ok" className="inline-flex items-center gap-1">
            <CheckCircle size={14} weight="fill" aria-hidden />
            {counts.success} succes
          </Badge>
          <Badge variant="danger" className="inline-flex items-center gap-1">
            <XCircle size={14} weight="fill" aria-hidden />
            {counts.error} fejl
          </Badge>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <RunFilters
          vendor={vendor}
          from={from}
          to={to}
          status={statusFilters}
          vendorOptions={vendorOptions}
          onChange={handleFiltersChange}
        />

        {validationError ? (
          <Alert variant="destructive" className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <AlertTitle>Ugyldigt datointerval</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </div>
          </Alert>
        ) : null}

        {fieldErrors.length ? (
          <Alert variant="destructive" className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <AlertTitle>Kunne ikke hente data</AlertTitle>
              <AlertDescription>
                {fieldErrors.map((msg, idx) => (
                  <span key={`${msg}-${idx}`} className="block">
                    {msg}
                  </span>
                ))}
              </AlertDescription>
            </div>
          </Alert>
        ) : null}

        {!validationError ? (
          showStatsSkeleton ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-20 animate-pulse rounded-2xl bg-white/60 dark:bg-[hsl(var(--surface))]/60"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Kørsler i vinduet" value={totalRuns} />
              <Stat label="Succes" value={counts.success} tone="success" />
              <Stat label="Fejl" value={counts.error} tone="destructive" />
              <Stat label="I gang" value={counts.running} />
              <Stat label="Seneste kørsel" value={latestRunLabel} />
            </div>
          )
        ) : null}

        {!validationError ? (
          <>
            <RunTable
              vendor={vendor}
              from={queryFrom}
              to={queryTo}
              status={statusFilters}
              pageSize={pageSize}
              onRunSelect={handleRunSelect}
              onMetaChange={handleMetaChange}
              refreshToken={refreshToken}
            />

            {tableMeta?.aggregates ? (
              <div className="rounded-2xl border border-white/20 bg-white/60 p-4 text-xs text-muted-foreground shadow-inner dark:border-white/10 dark:bg-[hsl(var(--surface))]/60">
                <p>
                  Vinduet viser op til {tableMeta.aggregates.pageSize} kørsler ad gangen.{' '}
                  {tableMeta.hasMore
                    ? 'Der er flere resultater tilgængelige.'
                    : 'Alle kørsler i vinduet er vist.'}
                </p>
                {tableMeta.nextCursor ? (
                  <p className="mt-1">Næste side-id: {tableMeta.nextCursor}</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <RunDetailDrawer
        open={drawerOpen}
        run={selectedRun}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedRun(null);
        }}
      />
    </section>
  );
}
