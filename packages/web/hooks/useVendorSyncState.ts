// src/hooks/useVendorSyncState.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VendorSyncSnapshot } from './useVendorSyncRuns';

export type VendorSyncStateOptions = {
  vendor: string;
  pollIntervalMs?: number | null;
};

export type VendorSyncStateResult = {
  snapshot: VendorSyncSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: { message: string; status?: number } | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
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

function getCatalogEndpoint(vendor: string): string | null {
  if (!vendor) return null;
  const slug = vendor.trim().toLowerCase();
  if (!slug) return null;
  return `/api/catalog/${slug}`;
}

function normalizeSnapshot(payload: any, vendor: string): VendorSyncSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw =
    payload?.sync && typeof payload.sync === 'object'
      ? payload.sync
      : typeof payload?.data?.sync === 'object'
        ? payload.data.sync
        : null;

  if (!raw || typeof raw !== 'object') return null;

  const totalItems =
    parseNumber(raw.totalItems ?? raw.total ?? raw.items) ??
    parseNumber(payload?.totalItems ?? payload?.total);

  const lastSource =
    parseString(raw.lastSource ?? raw.sourcePath ?? raw.source) ??
    parseString(payload?.sourcePath ?? payload?.source);

  return {
    vendor,
    totalItems,
    lastRunAt: parseDate(raw.lastRunAt ?? raw.lastSyncAt ?? raw.syncedAt),
    lastDurationMs: parseNumber(raw.lastDurationMs ?? raw.durationMs ?? raw.lastRunDurationMs),
    lastSource,
    lastHash: parseString(raw.hash ?? raw.lastHash ?? raw.aggregateHash),
    lastRunBy: parseString(raw.lastRunBy ?? raw.actor ?? raw.user ?? raw.runBy),
    lastError: parseString(raw.lastError ?? raw.error ?? raw.failureMessage ?? raw.reason),
  } satisfies VendorSyncSnapshot;
}

export function useVendorSyncState({
  vendor,
  pollIntervalMs = 120_000,
}: VendorSyncStateOptions): VendorSyncStateResult {
  const [snapshot, setSnapshot] = useState<VendorSyncSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(() => getCatalogEndpoint(vendor), [vendor]);

  const fetchState = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!endpoint) {
        setError({ message: 'Ukendt leverandør' });
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (opts.silent) setIsRefreshing(true);
      else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const res = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const message =
            typeof payload?.error === 'string'
              ? payload.error
              : `Kunne ikke hente sync-data (${res.status})`;
          throw { message, status: res.status } as { message: string; status?: number };
        }

        const payload = await res.json().catch(() => null);
        const parsed = normalizeSnapshot(payload, vendor);
        setSnapshot(parsed);
        setLastUpdated(new Date());
        setError(null);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        const message = typeof err?.message === 'string' ? err.message : 'Kunne ikke hente sync-data';
        setError({ message, status: typeof err?.status === 'number' ? err.status : undefined });
        console.error('[useVendorSyncState] fetch error', err);
      } finally {
        if (!opts.silent) setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [endpoint, vendor],
  );

  useEffect(() => {
    fetchState();
    return () => abortRef.current?.abort();
  }, [fetchState]);

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return undefined;
    const id = window.setInterval(() => {
      fetchState({ silent: true }).catch(() => undefined);
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [fetchState, pollIntervalMs]);

  const refresh = useCallback(async () => {
    await fetchState({ silent: true });
  }, [fetchState]);

  return { snapshot, isLoading, isRefreshing, error, refresh, lastUpdated };
}

