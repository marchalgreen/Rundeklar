'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ArrowsClockwise } from '@phosphor-icons/react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import RegistryTable from './RegistryTable';
import RegistryDrawer from './RegistryDrawer';

export type SerializedVendorIntegration = {
  id: string;
  type: 'SCRAPER' | 'API';
  scraperPath: string | null;
  apiBaseUrl: string | null;
  apiAuthType: string | null;
  apiKey: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedVendor = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  integration: SerializedVendorIntegration | null;
};

export type VendorSyncStateSnapshot = {
  vendor: string;
  totalItems: number | null;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  lastSource: string | null;
  lastHash: string | null;
  lastRunBy: string | null;
  lastError: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type VendorRegistryRow = {
  vendor: SerializedVendor;
  state: VendorSyncStateSnapshot | null;
};

export type VendorTestOptions = {
  sourcePath?: string | null;
};

export type VendorCredentialPayload = {
  scraperPath?: string | null;
  apiBaseUrl?: string | null;
  apiKey?: string | null;
};

type RegistryListResponse = {
  ok: boolean;
  data: SerializedVendor[];
  error?: string;
  detail?: string;
};

type RegistryTestResponse = {
  ok: boolean;
  data?: {
    ok: boolean;
    vendor: string;
    vendorName: string;
    checkedAt: string;
    meta?: Record<string, unknown> | null;
  };
  error?: string;
  detail?: string;
};

type GenericApiResponse = {
  ok: boolean;
  error?: string;
  detail?: string;
};

async function fetchRegistry(): Promise<SerializedVendor[]> {
  const res = await fetch('/api/catalog/vendor-sync/registry', {
    method: 'GET',
    credentials: 'include',
  });

  let payload: RegistryListResponse | null = null;
  try {
    payload = (await res.json()) as RegistryListResponse;
  } catch (_err) {
    throw new Error('Ugyldigt svar fra registrerings-endpointet');
  }

  if (!res.ok || !payload?.ok) {
    const detail = payload?.detail || payload?.error || res.statusText;
    throw new Error(detail || 'Kunne ikke hente leverandører');
  }

  return payload.data;
}

async function fetchVendorState(slug: string): Promise<VendorSyncStateSnapshot | null> {
  const res = await fetch(`/api/catalog/vendor-sync/state?vendor=${encodeURIComponent(slug)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    return null;
  }

  try {
    const payload = (await res.json()) as { ok: boolean; snapshot: VendorSyncStateSnapshot | null };
    if (!payload.ok) return null;
    return payload.snapshot ?? null;
  } catch {
    return null;
  }
}

export default function RegistryWindow() {
  const [rows, setRows] = useState<VendorRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const mountedRef = useRef(true);
  mountedRef.current = true; // <-- important for Strict Mode
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const { success: showSuccess, error: showError } = useToast();

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
    } else if (mountedRef.current) {
      setRefreshing(true);
    }

    try {
      const vendors = await fetchRegistry();
      const states = await Promise.all(
        vendors.map(async (vendor) => {
          try {
            return await fetchVendorState(vendor.slug);
          } catch {
            return null;
          }
        }),
      );

      if (!mountedRef.current) return;

      const combined = vendors.map((vendor, idx) => ({ vendor, state: states[idx] ?? null }));
      setRows(combined);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Kunne ikke indlæse registreringen';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedRow = useMemo(() => {
    if (!selectedSlug) return null;
    return rows.find((row) => row.vendor.slug === selectedSlug) ?? null;
  }, [rows, selectedSlug]);

  const handleRefresh = useCallback(() => {
    void loadData({ silent: true });
  }, [loadData]);

  const handleTest = useCallback(
    async (slug: string, options?: VendorTestOptions) => {
      setTestingSlug(slug);
      try {
        const payload: Record<string, unknown> = {};
        if (options?.sourcePath) {
          payload.sourcePath = options.sourcePath;
        }

        const res = await fetch(`/api/catalog/vendor-sync/registry/${slug}/test`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
        });

        let body: RegistryTestResponse | null = null;
        try {
          body = (await res.json()) as RegistryTestResponse;
        } catch {
          body = null;
        }

        if (!res.ok || !body?.ok || body?.data?.ok === false) {
          const detail = body?.detail || body?.error || res.statusText || 'Testen mislykkedes';
          throw new Error(detail);
        }

        const totalItems = body?.data?.meta?.totalItems;
        const description =
          typeof totalItems === 'number'
            ? `Resultat: ${new Intl.NumberFormat('da-DK').format(totalItems)} produkter`
            : undefined;

        showSuccess('Forbindelsestest gennemført', description ? { description } : undefined);
        await loadData({ silent: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Forbindelsestest mislykkedes';
        showError('Forbindelsestest mislykkedes', { description: message });
      } finally {
        if (mountedRef.current) {
          setTestingSlug(null);
        }
      }
    },
    [loadData, showError, showSuccess],
  );

  const handleCredentialUpdate = useCallback(
    async (slug: string, payload: VendorCredentialPayload) => {
      setSavingSlug(slug);
      try {
        const res = await fetch(`/api/catalog/vendor-sync/registry/${slug}/credentials`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials: payload }),
        });

        let body: GenericApiResponse | null = null;
        try {
          body = (await res.json()) as GenericApiResponse;
        } catch {
          body = null;
        }

        if (!res.ok || body?.ok === false) {
          const detail = body?.detail || body?.error || res.statusText || 'Opdatering mislykkedes';
          throw new Error(detail);
        }

        showSuccess('Legitimationsoplysninger opdateret');
        await loadData({ silent: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Kunne ikke opdatere legitimationsoplysninger';
        showError('Opdatering mislykkedes', { description: message });
      } finally {
        if (mountedRef.current) {
          setSavingSlug(null);
        }
      }
    },
    [loadData, showError, showSuccess],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Administrer leverandørintegrationer, test forbindelser og se seneste synkroniseringer.
        </div>
        <Button
          type="button"
          variant="soft"
          size="pill"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="self-start sm:self-auto"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowsClockwise size={18} weight="bold" />
          )}
          Opdater
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Kunne ikke indlæse leverandører</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-3xl border border-[hsl(var(--line))] bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
        <RegistryTable
          rows={rows}
          loading={loading}
          refreshing={refreshing}
          testingSlug={testingSlug}
          onRowSelect={setSelectedSlug}
          onTest={handleTest}
        />
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Indlæser leverandører…
          </div>
        ) : null}
      </div>

      <RegistryDrawer
        open={Boolean(selectedSlug)}
        row={selectedRow}
        testing={selectedRow ? testingSlug === selectedRow.vendor.slug : false}
        saving={selectedRow ? savingSlug === selectedRow.vendor.slug : false}
        onOpenChange={(next) => {
          if (!next) {
            setSelectedSlug(null);
          }
        }}
        onTest={handleTest}
        onSaveCredentials={handleCredentialUpdate}
      />
    </div>
  );
}
