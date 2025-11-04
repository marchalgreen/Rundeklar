import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type HistoryRun = {
  runId: string;
  status: string;
  totalItems: number | null;
  durationMs: number | null;
  finishedAt: string | null;
};

export type VendorHistoryEntry = {
  vendor: string;
  runs: HistoryRun[];
};

type FetchError = { message: string } | null;

type UseVendorSyncHistoryOptions = {
  limit?: number;
  enabled?: boolean;
};

type UseVendorSyncHistoryResult = {
  histories: VendorHistoryEntry[];
  isLoading: boolean;
  error: FetchError;
  refresh: () => Promise<void>;
};

const ENDPOINT = '/api/catalog/vendor-sync/history';

type ApiResponse = {
  ok: boolean;
  vendors?: VendorHistoryEntry[];
  error?: string;
  detail?: unknown;
};

async function readJson(response: Response): Promise<ApiResponse | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiResponse;
  } catch (err) {
    console.error('[useVendorSyncHistory] failed to parse response', err);
    return null;
  }
}

function buildUrl(limit: number | undefined): string {
  if (!limit || !Number.isFinite(limit)) return ENDPOINT;
  return `${ENDPOINT}?limit=${Math.max(1, Math.trunc(limit))}`;
}

export function useVendorSyncHistory(
  options: UseVendorSyncHistoryOptions = {},
): UseVendorSyncHistoryResult {
  const { limit, enabled = true } = options;
  const [histories, setHistories] = useState<VendorHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FetchError>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(buildUrl(limit), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });

      const json = await readJson(res);
      if (!res.ok || !json?.ok || !json.vendors) {
        const detail = (json?.detail as string | undefined) ?? json?.error ?? res.statusText;
        throw new Error(detail || 'Kunne ikke hente historik');
      }

      if (!mountedRef.current) return;
      setHistories(json.vendors);
      setError(null);
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
      }
    }
  }, [enabled, limit]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  return useMemo(
    () => ({ histories, isLoading: loading, error, refresh }),
    [error, histories, loading, refresh],
  );
}

