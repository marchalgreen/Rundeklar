import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type OverviewRun = {
  vendor: string;
  startedAt: string;
  runId: string;
  mode: 'preview' | 'apply';
};

type OverviewMetrics = {
  last24h: {
    total: number;
    success: number;
    failed: number;
    avgDurationMs: number;
  } | null;
  inProgress: OverviewRun[];
};

type FetchError = { message: string } | null;

type UseVendorSyncOverviewOptions = {
  enabled?: boolean;
  pollIntervalMs?: number | null;
};

type UseVendorSyncOverviewResult = {
  metrics: OverviewMetrics;
  isLoading: boolean;
  isRefreshing: boolean;
  error: FetchError;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
};

const ENDPOINT = '/api/catalog/vendor-sync/overview';

type ApiResponse = {
  ok: boolean;
  metrics?: {
    last24h: {
      total: number;
      success: number;
      failed: number;
      avgDurationMs: number;
    };
    inProgress: OverviewRun[];
  };
  error?: string;
  detail?: unknown;
};

async function readJson(response: Response): Promise<ApiResponse | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiResponse;
  } catch (err) {
    console.error('[useVendorSyncOverview] failed to parse response', err);
    return null;
  }
}

export function useVendorSyncOverview(
  options: UseVendorSyncOverviewOptions = {},
): UseVendorSyncOverviewResult {
  const { enabled = true, pollIntervalMs = null } = options;
  const [metrics, setMetrics] = useState<OverviewMetrics>({ last24h: null, inProgress: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<FetchError>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchMetrics = useCallback(
    async (silent = false) => {
      if (!enabled) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const res = await fetch(ENDPOINT, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        const json = await readJson(res);
        if (!res.ok || !json?.ok || !json.metrics) {
          const detail = (json?.detail as string | undefined) ?? json?.error ?? res.statusText;
          throw new Error(detail || 'Kunne ikke hente oversigt');
        }

        if (!mountedRef.current) return;
        setMetrics({
          last24h: json.metrics.last24h ?? null,
          inProgress: json.metrics.inProgress ?? [],
        });
        setError(null);
        setUpdatedAt(new Date());
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Ukendt fejl';
        setError({ message });
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled],
  );

  const refresh = useCallback(async () => {
    await fetchMetrics(true);
  }, [fetchMetrics]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    void fetchMetrics(false);
  }, [enabled, fetchMetrics]);

  useEffect(() => {
    if (!enabled) return;
    if (pollIntervalMs == null || pollIntervalMs <= 0) return;

    const id = setInterval(() => {
      void fetchMetrics(true);
    }, pollIntervalMs);

    return () => {
      clearInterval(id);
    };
  }, [enabled, fetchMetrics, pollIntervalMs]);

  const state = useMemo<UseVendorSyncOverviewResult>(
    () => ({
      metrics,
      isLoading: loading,
      isRefreshing: refreshing,
      error,
      refresh,
      lastUpdated: updatedAt,
    }),
    [error, loading, metrics, refresh, refreshing, updatedAt],
  );

  return state;
}

export type { OverviewMetrics, OverviewRun };

