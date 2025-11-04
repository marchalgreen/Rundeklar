import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

import type { VendorSyncRun, VendorSyncRunMetrics } from './useVendorSyncRuns';

export type VendorSyncObservabilityCounts = {
  success: number;
  error: number;
  running: number;
};

export type VendorSyncObservabilityAggregates = {
  vendorId: string;
  range: {
    start: Date;
    end: Date;
  };
  totalRuns: number;
  counts: VendorSyncObservabilityCounts;
  latestRunAt: Date | null;
  pageSize: number;
  hasMore: boolean;
};

type FetchError = {
  message: string;
  status?: number;
  detail?: unknown;
};

export type VendorSyncObservabilityStatusFilter = 'success' | 'failed' | 'running';

type UseVendorSyncObservabilityOptions = {
  vendor: string;
  from?: Date | null;
  to?: Date | null;
  status?: VendorSyncObservabilityStatusFilter[] | null;
  pageSize?: number;
  cursor?: string | null;
  enabled?: boolean;
};

type UseVendorSyncObservabilityResult = {
  items: VendorSyncRun[];
  aggregates: VendorSyncObservabilityAggregates | null;
  nextCursor: string | null;
  refresh: () => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: FetchError | null;
  lastUpdated: Date | null;
};

type NormalizedStatus = 'success' | 'error' | 'running';

const STATUS_PARAM_MAP: Record<VendorSyncObservabilityStatusFilter, NormalizedStatus> = {
  success: 'success',
  failed: 'error',
  running: 'running',
};

type NormalizedPayload = {
  vendorId: string;
  range: { start: Date; end: Date };
  pageSize: number;
  totalRuns: number;
  counts: VendorSyncObservabilityCounts;
  latestRunAt: Date | null;
  hasMore: boolean;
  nextCursor: string | null;
  runs: VendorSyncRun[];
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function toCounts(raw: any, fallback?: VendorSyncObservabilityCounts): VendorSyncObservabilityCounts {
  return {
    success: parseNumber(raw?.success) ?? fallback?.success ?? 0,
    error: parseNumber(raw?.error) ?? fallback?.error ?? 0,
    running: parseNumber(raw?.running) ?? fallback?.running ?? 0,
  } satisfies VendorSyncObservabilityCounts;
}

function toMetrics(raw: any): VendorSyncRunMetrics {
  return {
    total: parseNumber(raw?.total ?? raw?.totalItems),
    created: parseNumber(raw?.created),
    updated: parseNumber(raw?.updated),
    removed: parseNumber(raw?.removed),
    unchanged: parseNumber(raw?.unchanged),
  } satisfies VendorSyncRunMetrics;
}

function normalizeRunPayload(raw: any): VendorSyncRun | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = parseString((raw as { id?: string }).id ?? null);
  if (!id) return null;

  const vendor = parseString((raw as { vendor?: string }).vendor) ?? DEFAULT_VENDOR_SLUG;
  const statusRaw = parseString((raw as { status?: string }).status)?.toLowerCase() ?? 'pending';
  const status: VendorSyncRun['status'] =
    statusRaw === 'success' || statusRaw === 'succeeded'
      ? 'success'
      : statusRaw === 'running'
        ? 'running'
        : statusRaw === 'error'
          ? 'error'
          : statusRaw === 'failed'
            ? 'error'
            : statusRaw === 'pending'
              ? 'pending'
              : 'error';

  const startedAt = parseDate((raw as { startedAt?: string | Date }).startedAt) ?? null;
  const finishedAt =
    parseDate((raw as { completedAt?: string | Date; finishedAt?: string | Date }).completedAt) ??
    parseDate((raw as { finishedAt?: string | Date }).finishedAt) ??
    null;

  let durationMs = parseNumber((raw as { durationMs?: number }).durationMs);
  if ((durationMs == null || durationMs < 0) && startedAt && finishedAt) {
    durationMs = Math.max(0, finishedAt.valueOf() - startedAt.valueOf());
  }

  let dryRun: boolean | null = null;
  if (typeof (raw as { dryRun?: unknown }).dryRun === 'boolean') {
    dryRun = (raw as { dryRun: boolean }).dryRun;
  } else if (typeof (raw as { dryRun?: unknown }).dryRun === 'number') {
    dryRun = Number((raw as { dryRun: number }).dryRun) !== 0;
  } else if (typeof (raw as { dryRun?: unknown }).dryRun === 'string') {
    const normalized = (raw as { dryRun: string }).dryRun.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') dryRun = true;
    else if (normalized === 'false' || normalized === '0' || normalized === 'no') dryRun = false;
  }
  if (dryRun == null && typeof (raw as { isDryRun?: unknown }).isDryRun === 'boolean') {
    dryRun = (raw as { isDryRun: boolean }).isDryRun;
  }

  const actor = parseString((raw as { actor?: string }).actor);
  const sourcePath = parseString((raw as { sourcePath?: string }).sourcePath);
  const hash = parseString((raw as { hash?: string }).hash);
  const error = parseString((raw as { error?: string }).error);

  const metrics = toMetrics((raw as { counts?: unknown; metrics?: unknown }).counts ?? (raw as { metrics?: unknown }).metrics ?? {});

  return {
    id,
    vendor,
    status,
    startedAt,
    finishedAt,
    durationMs: durationMs ?? null,
    dryRun,
    actor: actor ?? null,
    sourcePath: sourcePath ?? null,
    hash: hash ?? null,
    error: error ?? null,
    metrics,
    raw,
  } satisfies VendorSyncRun;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('[useVendorSyncObservability] failed to parse JSON response', err);
    return null;
  }
}

function normalizePayload(
  raw: any,
  fallback: { vendor: string; start?: Date | null; end?: Date | null; pageSize?: number },
): NormalizedPayload | null {
  if (!raw || typeof raw !== 'object') return null;

  const vendorId = parseString(raw.vendorId) ?? fallback.vendor;

  const rangeStart = parseDate(raw.range?.start) ?? fallback.start ?? null;
  const rangeEnd = parseDate(raw.range?.end) ?? fallback.end ?? null;
  if (!rangeStart || !rangeEnd) return null;

  const pageSize = parseNumber(raw.pageSize) ?? fallback.pageSize ?? 1;
  const totalRuns = parseNumber(raw.totalRuns) ?? 0;
  const counts = toCounts(raw.counts);
  const latestRunAt = parseDate(raw.latestRunAt);
  const hasMore = Boolean(raw.hasMore);
  const nextCursor = parseString(raw.nextCursor);
  const runs = Array.isArray(raw.runs)
    ? raw.runs
        .map((entry: unknown) => normalizeRunPayload(entry))
        .filter((entry: VendorSyncRun | null): entry is VendorSyncRun => Boolean(entry))
    : [];

  return {
    vendorId,
    range: { start: rangeStart, end: rangeEnd },
    pageSize: Math.max(1, Math.trunc(pageSize)),
    totalRuns,
    counts,
    latestRunAt: latestRunAt ?? null,
    hasMore,
    nextCursor: nextCursor ?? null,
    runs,
  } satisfies NormalizedPayload;
}

export function useVendorSyncObservability({
  vendor,
  from,
  to,
  status,
  pageSize,
  cursor,
  enabled = true,
}: UseVendorSyncObservabilityOptions): UseVendorSyncObservabilityResult {
  const [items, setItems] = useState<VendorSyncRun[]>([]);
  const [aggregates, setAggregates] = useState<VendorSyncObservabilityAggregates | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<FetchError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const dataRef = useRef<NormalizedPayload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startIso = useMemo(() => (from ? from.toISOString() : null), [from]);
  const endIso = useMemo(() => (to ? to.toISOString() : null), [to]);

  const statusParams = useMemo(() => {
    if (!status || !status.length) return [] as NormalizedStatus[];
    return status
      .map((value) => STATUS_PARAM_MAP[value])
      .filter((value): value is NormalizedStatus => Boolean(value));
  }, [status]);

  const canFetch = Boolean(enabled && vendor && startIso && endIso);

  const fetchData = useCallback(async () => {
    if (!canFetch || !startIso || !endIso) {
      dataRef.current = null;
      setItems([]);
      setAggregates(null);
      setNextCursor(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const hasExisting = dataRef.current != null;
    setError(null);
    setIsLoading(!hasExisting);
    setIsRefreshing(hasExisting);

    const params = new URLSearchParams({
      vendorId: vendor,
      start: startIso,
      end: endIso,
    });
    if (pageSize != null) params.set('limit', String(pageSize));
    if (cursor) params.set('cursor', cursor);
    for (const value of statusParams) {
      params.append('status', value);
    }

    try {
      const resp = await fetch(`/api/catalog/vendor-sync/observability?${params.toString()}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });

      const payload = await readJson(resp);
      if (!resp.ok) {
        const message =
          typeof payload?.detail === 'string'
            ? payload.detail
            : typeof payload?.error === 'string'
              ? payload.error
              : resp.status === 404
                ? 'Ikke fundet'
                : 'Kunne ikke hente data';
        throw {
          message,
          status: resp.status,
          detail: payload?.detail,
        } satisfies FetchError;
      }

      if (!payload?.ok) {
        throw {
          message: typeof payload?.error === 'string' ? payload.error : 'Ukendt fejl',
          status: resp.status,
          detail: payload?.detail,
        } satisfies FetchError;
      }

      const normalized = normalizePayload(payload.data, {
        vendor,
        start: from ?? (startIso ? new Date(startIso) : null),
        end: to ?? (endIso ? new Date(endIso) : null),
        pageSize,
      });

      if (normalized) {
        dataRef.current = normalized;
        setItems(normalized.runs);
        setAggregates({
          vendorId: normalized.vendorId,
          range: normalized.range,
          totalRuns: normalized.totalRuns,
          counts: normalized.counts,
          latestRunAt: normalized.latestRunAt,
          pageSize: normalized.pageSize,
          hasMore: normalized.hasMore,
        });
        setNextCursor(normalized.nextCursor);
        setLastUpdated(new Date());
      } else {
        dataRef.current = null;
        setItems([]);
        setAggregates(null);
        setNextCursor(null);
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      const fetchErr: FetchError =
        err instanceof Error
          ? { message: err.message }
          : typeof err === 'object' && err !== null && 'message' in err
            ? (err as FetchError)
            : { message: 'Ukendt fejl' };
      setError(fetchErr);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canFetch, cursor, endIso, from, pageSize, startIso, statusParams, to, vendor]);

  useEffect(() => {
    if (!canFetch) {
      dataRef.current = null;
      setItems([]);
      setAggregates(null);
      setNextCursor(null);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return () => abortRef.current?.abort();
    }

    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [canFetch, fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    items,
    aggregates,
    nextCursor,
    refresh,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
  } satisfies UseVendorSyncObservabilityResult;
}
