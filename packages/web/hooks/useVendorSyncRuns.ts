import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type VendorSyncRunStatus = 'success' | 'error' | 'running' | 'pending';

export type VendorSyncRunMetrics = {
  total: number | null;
  created: number | null;
  updated: number | null;
  removed: number | null;
  unchanged: number | null;
};

export type VendorSyncRun = {
  id: string;
  vendor: string;
  status: VendorSyncRunStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  dryRun: boolean | null;
  actor: string | null;
  sourcePath: string | null;
  hash: string | null;
  error: string | null;
  metrics: VendorSyncRunMetrics;
  raw: unknown;
};

export type VendorSyncSnapshot = {
  vendor: string;
  totalItems: number | null;
  lastRunAt: Date | null;
  lastDurationMs: number | null;
  lastSource: string | null;
  lastHash: string | null;
  lastRunBy: string | null;
  lastError: string | null;
};

type FetchError = {
  message: string;
  status?: number;
};

export type UseVendorSyncRunsOptions = {
  vendor: string;
  limit?: number;
  runsEndpoint?: string;
  stateEndpoint?: string | null;
  pollIntervalMs?: number | null;
};

export type UseVendorSyncRunsResult = {
  runs: VendorSyncRun[];
  latestRun: VendorSyncRun | null;
  snapshot: VendorSyncSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: FetchError | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.valueOf())) return d;
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

const SUCCESS_STATUSES = new Set(['success', 'succeeded', 'ok', 'completed', 'complete', 'done']);
const ERROR_STATUSES = new Set(['failed', 'failure', 'error']);
const RUNNING_STATUSES = new Set(['running', 'in_progress', 'processing', 'active']);

function normalizeStatus(value: unknown): VendorSyncRunStatus {
  if (!value) return 'pending';
  const raw = typeof value === 'string' ? value.toLowerCase() : '';
  if (SUCCESS_STATUSES.has(raw)) return 'success';
  if (ERROR_STATUSES.has(raw)) return 'error';
  if (RUNNING_STATUSES.has(raw)) return 'running';
  return 'pending';
}

function normalizeRun(raw: any, vendor: string): VendorSyncRun | null {
  if (!raw || typeof raw !== 'object') return null;
  const startedAt = parseDate(
    raw.startedAt ?? raw.started ?? raw.beginAt ?? raw.createdAt ?? raw.timestamp,
  );
  const finishedAt = parseDate(
    raw.finishedAt ?? raw.completedAt ?? raw.endAt ?? raw.endedAt ?? raw.updatedAt,
  );
  const status = normalizeStatus(raw.status ?? raw.state ?? raw.result ?? raw.phase);
  const durationMs = parseNumber(raw.durationMs ?? raw.duration ?? raw.runDurationMs);
  const metricsSource = raw.metrics ?? raw.summary ?? raw.counts ?? raw.stats ?? {};
  const metrics: VendorSyncRunMetrics = {
    total: parseNumber(
      raw.total ?? metricsSource.total ?? metricsSource.items ?? metricsSource.totalItems,
    ),
    created: parseNumber(metricsSource.created ?? metricsSource.creates ?? metricsSource.inserted),
    updated: parseNumber(metricsSource.updated ?? metricsSource.updates ?? metricsSource.modified),
    removed: parseNumber(
      metricsSource.removed ?? metricsSource.deleted ?? metricsSource.removedItems,
    ),
    unchanged: parseNumber(
      metricsSource.unchanged ?? metricsSource.untouched ?? metricsSource.skipped,
    ),
  };

  const hash = parseString(raw.hash ?? raw.digest ?? raw.lastHash ?? raw.aggregateHash);
  let dryRun: boolean | null = null;
  if (typeof raw.dryRun === 'boolean') dryRun = raw.dryRun;
  else if (typeof raw.dryRun === 'number') dryRun = raw.dryRun !== 0;
  else if (typeof raw.dryRun === 'string') {
    const normalized = raw.dryRun.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') dryRun = true;
    else if (normalized === 'false' || normalized === '0' || normalized === 'no') dryRun = false;
  }
  if (dryRun == null && typeof raw.isDryRun === 'boolean') dryRun = raw.isDryRun;
  const sourcePath = parseString(raw.sourcePath ?? raw.source ?? raw.input ?? raw.file);
  const actor = parseString(raw.actor ?? raw.runBy ?? raw.triggeredBy ?? raw.user);
  const error = parseString(raw.error ?? raw.lastError ?? raw.failureMessage ?? raw.reason);

  let runId = parseString(raw.id ?? raw.runId ?? raw.uid);
  if (!runId) {
    const parts = [
      vendor,
      startedAt ? startedAt.toISOString() : null,
      finishedAt ? finishedAt.toISOString() : null,
      hash,
    ];
    const fallback = parts.filter(Boolean).join('::');
    runId = fallback || `run-${Math.random().toString(36).slice(2)}`;
  }

  let normalizedDuration = durationMs;
  if (normalizedDuration == null && startedAt && finishedAt) {
    normalizedDuration = Math.max(0, finishedAt.valueOf() - startedAt.valueOf());
  }

  return {
    id: runId,
    vendor,
    status,
    startedAt,
    finishedAt,
    durationMs: normalizedDuration,
    dryRun,
    actor,
    sourcePath,
    hash,
    error,
    metrics,
    raw,
  };
}

function normalizeSnapshot(raw: any, vendor: string): VendorSyncSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    vendor,
    totalItems: parseNumber(raw.totalItems ?? raw.total ?? raw.items),
    lastRunAt: parseDate(raw.lastRunAt ?? raw.lastSyncAt ?? raw.syncedAt),
    lastDurationMs: parseNumber(raw.lastDurationMs ?? raw.durationMs ?? raw.lastRunDurationMs),
    lastSource: parseString(raw.lastSource ?? raw.sourcePath ?? raw.source),
    lastHash: parseString(raw.lastHash ?? raw.hash ?? raw.aggregateHash),
    lastRunBy: parseString(raw.lastRunBy ?? raw.actor ?? raw.user),
    lastError: parseString(raw.lastError ?? raw.error ?? raw.failureMessage ?? raw.reason),
  };
}

async function readJson(input: Response): Promise<any> {
  const text = await input.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('[useVendorSyncRuns] failed to parse JSON response', err);
    return null;
  }
}

function extractRuns(payload: any, vendor: string): VendorSyncRun[] {
  if (!payload) return [];
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.runs)
      ? payload.runs
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : Array.isArray(payload?.data?.runs)
            ? payload.data.runs
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

  const normalized: VendorSyncRun[] = arr
    .map((entry: unknown) => normalizeRun(entry, vendor))
    .filter((entry: unknown): entry is VendorSyncRun => Boolean(entry));

  return normalized.sort((a: VendorSyncRun, b: VendorSyncRun) => {
    const aTime = a.startedAt ? a.startedAt.valueOf() : 0;
    const bTime = b.startedAt ? b.startedAt.valueOf() : 0;
    return bTime - aTime;
  });
}

export function useVendorSyncRuns({
  vendor,
  limit = 10,
  runsEndpoint = '/api/catalog/vendor-sync/runs',
  stateEndpoint = '/api/catalog/vendor-sync/state',
  pollIntervalMs = 60_000,
}: UseVendorSyncRunsOptions): UseVendorSyncRunsResult {
  const [runs, setRuns] = useState<VendorSyncRun[]>([]);
  const [snapshot, setSnapshot] = useState<VendorSyncSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<FetchError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!vendor) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (opts.silent) setIsRefreshing(true);
      else {
        setIsLoading(true);
        setError(null);
      }

      const params = new URLSearchParams({ vendor });
      if (limit) params.set('limit', String(limit));

      try {
        const runUrl = `${runsEndpoint}?${params.toString()}`;
        const [runRes, stateRes] = await Promise.all([
          fetch(runUrl, { cache: 'no-store', signal: controller.signal }),
          stateEndpoint
            ? fetch(`${stateEndpoint}?${params.toString()}`, {
                cache: 'no-store',
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ]);

        if (runRes && !runRes.ok) {
          const payload = await readJson(runRes).catch(() => null);
          throw {
            message:
              parseString(payload?.error) ?? `Failed to load vendor sync runs (${runRes.status})`,
            status: runRes.status,
          } satisfies FetchError;
        }

        const runPayload = runRes ? await readJson(runRes) : null;
        setRuns(extractRuns(runPayload, vendor));

        if (stateRes) {
          if (!stateRes.ok) {
            const payload = await readJson(stateRes).catch(() => null);
            console.warn('[useVendorSyncRuns] snapshot request failed', payload);
          } else {
            const statePayload = await readJson(stateRes);
            setSnapshot(normalizeSnapshot(statePayload?.snapshot ?? statePayload, vendor));
          }
        }

        setLastUpdated(new Date());
        setError(null);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        const message =
          typeof err?.message === 'string'
            ? err.message
            : 'Kunne ikke hente leverandør-synkroniseringer';
        setError({ message, status: typeof err?.status === 'number' ? err.status : undefined });
        console.error('[useVendorSyncRuns] fetch error', err);
      } finally {
        if (!opts.silent) setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [vendor, limit, runsEndpoint, stateEndpoint],
  );

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return undefined;
    const id = window.setInterval(() => {
      fetchData({ silent: true });
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [fetchData, pollIntervalMs]);

  const latestRun = useMemo(() => {
    if (runs.length > 0) return runs[0];
    if (!snapshot) return null;
    return {
      id: `${snapshot.vendor}-snapshot`,
      vendor: snapshot.vendor,
      status: snapshot.lastError ? 'error' : 'success',
      startedAt: snapshot.lastRunAt,
      finishedAt: snapshot.lastRunAt,
      durationMs: snapshot.lastDurationMs,
      dryRun: null,
      actor: snapshot.lastRunBy,
      sourcePath: snapshot.lastSource,
      hash: snapshot.lastHash,
      error: snapshot.lastError,
      metrics: {
        total: snapshot.totalItems,
        created: null,
        updated: null,
        removed: null,
        unchanged: null,
      },
      raw: snapshot,
    } satisfies VendorSyncRun;
  }, [runs, snapshot]);

  const refresh = useCallback(async () => {
    await fetchData({ silent: true });
  }, [fetchData]);

  return {
    runs,
    latestRun,
    snapshot,
    isLoading,
    isRefreshing,
    error,
    refresh,
    lastUpdated,
  };
}
