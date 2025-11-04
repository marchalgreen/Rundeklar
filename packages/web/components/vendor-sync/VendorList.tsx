'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  ArrowsClockwise,
  CheckCircle,
  DownloadSimple,
  FunnelSimple,
  MagnifyingGlass,
  Plugs,
  Plus,
  Warning,
  XCircle,
} from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SegmentedPills from '@/components/ui/SegmentedPills';
import { useToast } from '@/hooks/use-toast';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';
import { cn } from '@/lib/utils';
import { hasAdapter } from '@/lib/catalog/normalization/adapters/hasAdapter';
import { getNormalizationAdapter } from '@/lib/catalog/normalization/adapters';
import type {
  SerializedVendor,
  SerializedVendorIntegration,
  SerializedVendorState,
} from '@/lib/catalog/vendorRegistry';

import { useVendorSyncHistory, type VendorHistoryEntry } from '@/hooks/useVendorSyncHistory';

type VendorListProps = {
  initialVendors?: SerializedVendor[];
  initialHistories?: VendorHistoryEntry[];
};

const API_PATH = '/api/catalog/vendor-sync/vendors';

type VendorListResponse = {
  ok: boolean;
  vendors: SerializedVendor[];
  error?: string;
  detail?: string;
};

type AlertNotifyResponse = {
  ok: boolean;
  toast?: { title?: string; description?: string };
  error?: string;
  detail?: string;
};

type AdapterFilterValue = 'all' | 'has' | 'missing';
type IntegrationFilterValue = 'all' | 'SCRAPER' | 'API';
type StatusFilterValue = 'all' | 'healthy' | 'failing';

type TestAllSummary = {
  ok: boolean;
  tested: number;
  passed: number;
  failed: number;
  failures: Array<{ slug: string; error: string }>;
  error?: string;
  detail?: string;
};

type RegistryTestResponse = {
  ok: boolean;
  error?: string;
  detail?: string;
  data?: { ok?: boolean; meta?: { totalItems?: number } };
};

type VendorHealth = 'healthy' | 'failing' | 'unknown';
type InfoVariant = 'default' | 'muted' | 'success' | 'error';

async function fetchVendors(): Promise<SerializedVendor[]> {
  const res = await fetch(API_PATH, { method: 'GET', credentials: 'include' });
  let payload: VendorListResponse | null = null;

  try {
    payload = (await res.json()) as VendorListResponse;
  } catch {
    throw new Error('Kunne ikke læse leverandører');
  }

  if (!res.ok || !payload?.ok) {
    const detail = payload?.detail || payload?.error || res.statusText;
    throw new Error(detail || 'Kunne ikke hente leverandører');
  }

  return payload.vendors;
}

function AdapterStatusBadge({ slug }: { slug: string }) {
  if (hasAdapter(slug)) {
    try {
      const adapter = getNormalizationAdapter(slug);
      const label = adapter?.vendor?.name || adapter?.vendor?.slug || slug;
      return (
        <Badge variant="ok" className="inline-flex items-center gap-1">
          <CheckCircle size={14} weight="fill" aria-hidden />
          Adapter: {label}
        </Badge>
      );
    } catch {
      return (
        <Badge variant="ok" className="inline-flex items-center gap-1">
          <CheckCircle size={14} weight="fill" aria-hidden />
          Adapter registreret
        </Badge>
      );
    }
  }
  return (
    <Badge variant="warn" className="inline-flex items-center gap-1">
      <Warning size={14} weight="fill" aria-hidden />
      Adapter mangler
    </Badge>
  );
}

function IntegrationSummary({ integration }: { integration: SerializedVendorIntegration | null }) {
  if (!integration) {
    return (
      <Badge variant="danger" className="inline-flex items-center gap-1">
        <XCircle size={14} weight="fill" aria-hidden />
        Ingen integration
      </Badge>
    );
  }

  const label = integration.type === 'SCRAPER' ? 'Scraper' : 'API';
  return (
    <Badge variant="muted" className="inline-flex items-center gap-1">
      <FunnelSimple size={14} weight="bold" aria-hidden />
      Integration: {label}
    </Badge>
  );
}

function IntegrationDetails({ integration }: { integration: SerializedVendorIntegration | null }) {
  if (!integration) {
    return (
      <p className="text-sm text-muted-foreground">Opsæt credentials via registreringsvinduet.</p>
    );
  }

  if (integration.type === 'SCRAPER') {
    return (
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Scraper sti:</span>{' '}
        {integration.scraperPath ?? 'Ikke angivet'}
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <div>
        <span className="font-medium text-foreground">API base URL:</span>{' '}
        {integration.apiBaseUrl ?? 'Ikke angivet'}
      </div>
      <div>
        <span className="font-medium text-foreground">API nøgle:</span>{' '}
        {integration.apiKey ? '••••••••' : 'Ikke angivet'}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-3xl border border-[hsl(var(--line))] bg-white/60 p-6 shadow-sm backdrop-blur">
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="h-3 w-1/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

function FilterControl({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  items: Array<{ key: string; label: React.ReactNode }>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--line))] bg-white/60 p-3 shadow-sm backdrop-blur-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <SegmentedPills items={items} value={value} onChange={onChange} size="sm" className="w-full" />
    </div>
  );
}

function InfoCell({ label, value, variant = 'default' }: { label: string; value: React.ReactNode; variant?: InfoVariant }) {
  const tone =
    variant === 'success'
      ? 'text-emerald-600 dark:text-emerald-300'
      : variant === 'error'
      ? 'text-destructive'
      : variant === 'muted'
      ? 'text-muted-foreground'
      : 'text-foreground';
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn('text-sm font-medium', tone)}>{value}</div>
    </div>
  );
}

function getVendorHealth(vendor: SerializedVendor): VendorHealth {
  const integration = vendor.integration;
  const state = vendor.state;
  const hasFailure = Boolean(integration?.error || state?.lastError);
  if (integration?.lastTestOk === true && !hasFailure) {
    return 'healthy';
  }
  if (integration?.lastTestOk === false || hasFailure) {
    return 'failing';
  }
  return 'unknown';
}

function getStatusLabel(status: VendorHealth): string {
  if (status === 'healthy') return 'Sund';
  if (status === 'failing') return 'Fejl';
  return 'Ukendt';
}

function statusVariant(status: VendorHealth): InfoVariant {
  if (status === 'healthy') return 'success';
  if (status === 'failing') return 'error';
  return 'muted';
}

function formatItemCount(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toLocaleString('da-DK');
}

function formatLastSync(state: SerializedVendorState | null): string {
  if (!state) return '—';
  const dateLabel = formatVendorSyncDate(state.lastRunAt ?? null);
  if (dateLabel === '—') return '—';
  const durationLabel = formatVendorSyncDuration(state.lastDurationMs ?? null);
  return durationLabel === '—' ? dateLabel : `${dateLabel} · ${durationLabel}`;
}

function resolveLastError(vendor: SerializedVendor): string | null {
  return vendor.state?.lastError || vendor.integration?.error || null;
}

function resolveLastTest(
  integration: SerializedVendorIntegration | null,
): { label: React.ReactNode; variant: InfoVariant } {
  if (!integration) {
    return { label: '—', variant: 'muted' };
  }

  const timestampLabel = formatVendorSyncDate(integration.lastTestAt ?? null);

  if (integration.lastTestOk === true) {
    return {
      label: timestampLabel === '—' ? 'OK' : `OK · ${timestampLabel}`,
      variant: 'success',
    };
  }

  if (integration.lastTestOk === false) {
    return {
      label: timestampLabel === '—' ? 'Fejl' : `Fejl · ${timestampLabel}`,
      variant: 'error',
    };
  }

  return {
    label: timestampLabel,
    variant: timestampLabel === '—' ? 'muted' : 'default',
  };
}

const ADAPTER_FILTER_ITEMS = [
  { key: 'all', label: 'Alle' },
  { key: 'has', label: 'Har adapter' },
  { key: 'missing', label: 'Mangler' },
];

const INTEGRATION_FILTER_ITEMS = [
  { key: 'all', label: 'Alle' },
  { key: 'SCRAPER', label: 'Scraper' },
  { key: 'API', label: 'API' },
];

const STATUS_FILTER_ITEMS = [
  { key: 'all', label: 'Alle' },
  { key: 'healthy', label: 'Sund' },
  { key: 'failing', label: 'Fejl' },
];

export default function VendorList({ initialVendors = [], initialHistories }: VendorListProps = {}) {
  const [vendors, setVendors] = useState<SerializedVendor[]>(initialVendors);
  const [loading, setLoading] = useState(initialVendors.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { info: toastInfo, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [adapterFilter, setAdapterFilter] = useState<AdapterFilterValue>('all');
  const [integrationFilter, setIntegrationFilter] = useState<IntegrationFilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [testingAll, setTestingAll] = useState(false);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);
  const [previewingSlug, setPreviewingSlug] = useState<string | null>(null);

  const {
    histories,
    isLoading: remoteHistoryLoading,
    error: remoteHistoryError,
    refresh: historyRefresh,
  } = useVendorSyncHistory({ limit: 5, enabled: initialHistories == null });

  const effectiveHistories = initialHistories ?? histories;
  const historyLoading = initialHistories ? false : remoteHistoryLoading;
  const historyError = initialHistories ? null : remoteHistoryError;

  const historyByVendor = useMemo(() => {
    const map = new Map<string, VendorHistoryEntry['runs']>();
    for (const entry of effectiveHistories) {
      map.set(entry.vendor, entry.runs);
    }
    return map;
  }, [effectiveHistories]);

  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => a.slug.localeCompare(b.slug));
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedVendors.filter((vendor) => {
      const adapterPresent = hasAdapter(vendor.slug);
      const integrationType = vendor.integration?.type ?? null;
      const status = getVendorHealth(vendor);
      const matchesSearch =
        !query ||
        vendor.name.toLowerCase().includes(query) ||
        vendor.slug.toLowerCase().includes(query);
      const matchesAdapter =
        adapterFilter === 'all' || (adapterFilter === 'has' ? adapterPresent : !adapterPresent);
      const matchesIntegration =
        integrationFilter === 'all' ||
        (integrationType != null && integrationType === integrationFilter);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesAdapter && matchesIntegration && matchesStatus;
    });
  }, [adapterFilter, integrationFilter, searchTerm, sortedVendors, statusFilter]);

  const loadVendors = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await fetchVendors();
      setVendors(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke hente leverandører';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialVendors.length === 0) {
      void loadVendors();
    }
  }, [initialVendors.length, loadVendors]);

  const handleRefresh = useCallback(() => {
    void loadVendors({ silent: true });
    void historyRefresh();
  }, [historyRefresh, loadVendors]);

  const handleTestAll = useCallback(async () => {
    setTestingAll(true);
    try {
      const res = await fetch('/api/catalog/vendor-sync/registry/test-all', {
        method: 'POST',
        credentials: 'include',
      });
      let payload: TestAllSummary | null = null;
      try {
        payload = (await res.json()) as TestAllSummary;
      } catch {
        payload = null;
      }

      if (!res.ok || !payload?.ok) {
        const detail = payload?.detail || payload?.error || res.statusText || 'Kunne ikke teste integrationer';
        toastError('Kunne ikke teste integrationer', { description: detail });
        return;
      }

      const failureSlugs = (payload.failures ?? []).map((entry) => entry.slug).filter(Boolean);
      const title = `${payload.passed} forbindelser OK, ${payload.failed} fejlede`;
      const description =
        payload.failed > 0
          ? `Fejl: ${failureSlugs.join(', ') || 'ukendt'}`
          : `Alle ${payload.tested} testede forbindelser fungerer.`;

      toastInfo(title, { description });
      void loadVendors({ silent: true });
      void historyRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ukendt fejl under test';
      toastError('Kunne ikke teste integrationer', { description: message });
    } finally {
      setTestingAll(false);
    }
  }, [historyRefresh, loadVendors, toastError, toastInfo]);

  const handleVendorTest = useCallback(
    async (slug: string) => {
      setTestingSlug(slug);
      try {
        const res = await fetch(`/api/catalog/vendor-sync/registry/${slug}/test`, {
          method: 'POST',
          credentials: 'include',
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

        toastInfo('Forbindelsestest gennemført', description ? { description } : undefined);
        void loadVendors({ silent: true });
        void historyRefresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Forbindelsestest mislykkedes';
        toastError('Forbindelsestest mislykkedes', { description: message });
      } finally {
        setTestingSlug(null);
      }
    },
    [historyRefresh, loadVendors, toastError, toastInfo],
  );

  const handlePreview = useCallback(
    async (slug: string) => {
      setPreviewingSlug(slug);
      try {
        const res = await fetch('/api/catalog/vendor-sync/alerts/notify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'info',
            message: `Preview sync sat i kø for ${slug}`,
            vendors: [slug],
          }),
        });
        let payload: AlertNotifyResponse | null = null;
        try {
          payload = (await res.json()) as AlertNotifyResponse;
        } catch {
          payload = null;
        }

        if (!res.ok || !payload?.ok) {
          const detail = payload?.detail;
          const fallback = payload?.error;
          throw new Error(detail || fallback || res.statusText || 'Preview kunne ikke startes');
        }

        const toastTitle = payload.toast?.title ?? 'Preview sat i kø';
        const toastDescription = payload.toast?.description ?? `Preview job oprettet for ${slug}`;
        toastInfo(toastTitle, { description: toastDescription });
        void historyRefresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ukendt fejl';
        toastError('Kunne ikke starte preview', { description: message });
      } finally {
        setPreviewingSlug(null);
      }
    },
    [historyRefresh, toastError, toastInfo],
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Leverandører</h2>
        <p className="text-sm text-muted-foreground">
          Se eksisterende integrationer og onboard nye leverandører til vendor SDK’et.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-[hsl(var(--line))] bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Input
              type="search"
              placeholder="Søg leverandør…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="tahoe-input h-11 rounded-2xl border-[hsl(var(--line))] bg-white/80 pl-11 pr-4 text-sm"
            />
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="soft"
              size="pill"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowsClockwise size={18} weight="bold" />
              )}
              Opdater liste
            </Button>
            <Button
              type="button"
              variant="tahoe"
              size="pill"
              onClick={handleTestAll}
              disabled={loading || refreshing || testingAll}
            >
              {testingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plugs size={18} weight="bold" />
              )}
              Test alle forbindelser
            </Button>
            <Button
              type="button"
              variant="soft"
              size="pill"
              onClick={() => {
                try {
                  const csv = buildVendorCsv(filteredVendors, historyByVendor);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'vendor-sync.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => URL.revokeObjectURL(url), 0);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Kunne ikke eksportere CSV';
                  toastError('Eksport mislykkedes', { description: message });
                }
              }}
              disabled={filteredVendors.length === 0}
            >
              <DownloadSimple size={18} weight="bold" />
              Eksportér CSV
            </Button>
            <Button variant="tahoe" size="pill" asChild>
              <Link href="/vendor-sync/vendors/new" className="inline-flex items-center gap-2">
                <Plus size={18} weight="bold" />
                Tilføj leverandør
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FilterControl
            label="Adapter"
            value={adapterFilter}
            onChange={(value) => setAdapterFilter(value as AdapterFilterValue)}
            items={ADAPTER_FILTER_ITEMS}
          />
          <FilterControl
            label="Integration"
            value={integrationFilter}
            onChange={(value) => setIntegrationFilter(value as IntegrationFilterValue)}
            items={INTEGRATION_FILTER_ITEMS}
          />
          <FilterControl
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilterValue)}
            items={STATUS_FILTER_ITEMS}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-[hsl(var(--svc-repair))]/40 bg-[hsl(var(--svc-repair))/0.08] p-4 text-sm text-[hsl(var(--svc-repair))] shadow-sm backdrop-blur">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          <>
            <LoadingCard />
            <LoadingCard />
          </>
        ) : null}

        {!loading && sortedVendors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--line))] bg-white/60 p-10 text-center text-sm text-muted-foreground backdrop-blur">
            Ingen leverandører fundet endnu. Klik „Tilføj leverandør“ for at starte onboarding.
          </div>
        ) : null}

        {!loading && sortedVendors.length > 0 && filteredVendors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--line))] bg-white/60 p-10 text-center text-sm text-muted-foreground backdrop-blur">
            Ingen leverandører matcher dine filtre. Juster søgningen eller nulstil filtrene for at se resultater.
          </div>
        ) : null}

        {filteredVendors.map((vendor) => {
          const integration = vendor.integration ?? null;
          const state = vendor.state ?? null;
          const status = getVendorHealth(vendor);
          const lastError = resolveLastError(vendor);
          const lastTest = resolveLastTest(integration);
          const lastSyncLabel = formatLastSync(state);
          const itemCountLabel = formatItemCount(state?.totalItems ?? null);
          const integrationUpdatedLabel = integration?.updatedAt
            ? formatVendorSyncDate(integration.updatedAt)
            : '—';
          const integrationUpdatedVariant = integration?.updatedAt
            ? integrationUpdatedLabel === '—'
              ? 'muted'
              : 'default'
            : 'muted';
          const historyRuns = historyByVendor.get(vendor.slug) ?? [];
          const healthVariant = lastError ? 'danger' : integration?.lastTestOk === true ? 'ok' : 'muted';
          const healthIcon = lastError ? (
            <XCircle size={14} weight="fill" aria-hidden />
          ) : integration?.lastTestOk === true ? (
            <CheckCircle size={14} weight="fill" aria-hidden />
          ) : (
            <Warning size={14} weight="fill" aria-hidden />
          );
          return (
            <div
              key={vendor.id}
              className={cn(
                'rounded-3xl border border-[hsl(var(--line))] bg-white/70 p-6 shadow-sm transition hover:-translate-y-[1px] hover:shadow-lg backdrop-blur',
                refreshing ? 'opacity-75' : '',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-foreground">{vendor.name}</div>
                  <div className="text-xs text-muted-foreground">/{vendor.slug}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdapterStatusBadge slug={vendor.slug} />
                  <Badge variant={healthVariant} className="inline-flex items-center gap-1">
                    {healthIcon}
                    {getStatusLabel(status)}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoCell label="Integrationstype" value={<IntegrationSummary integration={integration} />} />
                <InfoCell label="Seneste synk" value={lastSyncLabel} variant={lastSyncLabel === '—' ? 'muted' : 'default'} />
                <InfoCell label="Antal varer" value={itemCountLabel} variant={typeof state?.totalItems === 'number' ? 'default' : 'muted'} />
                <InfoCell label="Seneste test" value={lastTest.label} variant={lastTest.variant} />
                <InfoCell label="Seneste fejl" value={lastError || 'Ingen fejl'} variant={lastError ? 'error' : 'muted'} />
                <InfoCell
                  label="Integration opdateret"
                  value={integrationUpdatedLabel}
                  variant={integrationUpdatedVariant}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[hsl(var(--line))]/60 bg-white/60 p-4 text-sm text-muted-foreground shadow-inner backdrop-blur-sm">
                <IntegrationDetails integration={integration} />
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-[hsl(var(--line))]/80 bg-white/60 p-4 shadow-inner backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Seneste 5 kørsler</span>
                  {historyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                </div>
                {historyError ? (
                  <div className="text-xs text-destructive">{historyError.message}</div>
                ) : null}
                <ol className="space-y-1 text-xs">
                  {historyRuns.length === 0 && !historyLoading ? (
                    <li className="text-muted-foreground">Ingen historik endnu.</li>
                  ) : null}
                  {historyRuns.map((run) => {
                    const statusIcon = historyStatusIcon(run.status);
                    const statusTone = historyStatusTone(run.status);
                    const finishedLabel =
                      run.status === 'running'
                        ? 'I gang'
                        : formatVendorSyncDate(run.finishedAt ?? null);
                    const itemsLabel = formatItemCount(run.totalItems ?? null);
                    const durationLabel = formatVendorSyncDuration(run.durationMs ?? null);
                    return (
                      <li
                        key={run.runId}
                        className="flex flex-wrap items-center gap-2 text-muted-foreground"
                      >
                        <span className={cn('font-semibold', statusTone)} aria-label={historyStatusLabel(run.status)}>
                          {statusIcon}
                        </span>
                        <span>{finishedLabel}</span>
                        <span>•</span>
                        <span>{itemsLabel} varer</span>
                        <span>•</span>
                        <span>{durationLabel}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="soft"
                  size="pill"
                  onClick={() => handleVendorTest(vendor.slug)}
                  disabled={testingSlug === vendor.slug || previewingSlug === vendor.slug}
                >
                  {testingSlug === vendor.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowsClockwise size={16} weight="bold" />
                  )}
                  Re-test
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  size="pill"
                  onClick={() => handlePreview(vendor.slug)}
                  disabled={previewingSlug === vendor.slug || testingSlug === vendor.slug}
                >
                  {previewingSlug === vendor.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MagnifyingGlass size={16} weight="bold" />
                  )}
                  Re-sync (preview)
                </Button>
                <Button type="button" variant="soft" size="pill" asChild>
                  <Link href={`/vendor-sync?vendor=${vendor.slug}`} className="inline-flex items-center gap-2">
                    Åbn run detalje
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function historyStatusIcon(status: string): string {
  if (status === 'success') return '✔︎';
  if (status === 'error') return '✖︎';
  if (status === 'running') return '▹';
  return '·';
}

function historyStatusLabel(status: string): string {
  if (status === 'success') return 'Fuldført';
  if (status === 'error') return 'Fejlet';
  if (status === 'running') return 'I gang';
  return 'Ukendt status';
}

function historyStatusTone(status: string): string {
  if (status === 'success') return 'text-emerald-600 dark:text-emerald-300';
  if (status === 'error') return 'text-destructive';
  if (status === 'running') return 'text-[hsl(var(--accent-blue))]';
  return 'text-muted-foreground';
}

function escapeCsv(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildVendorCsv(
  rows: SerializedVendor[],
  historyMap: Map<string, VendorHistoryEntry['runs']>,
): string {
  const header = [
    'Vendor',
    'Slug',
    'Status',
    'Seneste synk',
    'Antal varer',
    'Seneste test',
    'Seneste fejl',
    'Seneste run status',
    'Seneste run afsluttet',
    'Seneste run varer',
    'Seneste run varighed (ms)',
  ].join(',');

  const lines = rows.map((vendor) => {
    const history = historyMap.get(vendor.slug) ?? [];
    const latestRun = history[0] ?? null;
    const status = getVendorHealth(vendor);
    const state = vendor.state ?? null;
    const lastSync = formatLastSync(state);
    const itemCount = formatItemCount(state?.totalItems ?? null);
    const lastTest = resolveLastTest(vendor.integration ?? null);
    const lastError = resolveLastError(vendor) ?? '';
    const latestStatus = latestRun?.status ?? '';
    const latestFinished = latestRun?.finishedAt ? formatVendorSyncDate(latestRun.finishedAt) : '';
    const latestItems = latestRun?.totalItems ?? '';
    const latestDuration = latestRun?.durationMs ?? '';

    return [
      escapeCsv(vendor.name),
      escapeCsv(vendor.slug),
      escapeCsv(getStatusLabel(status)),
      escapeCsv(lastSync),
      escapeCsv(itemCount),
      escapeCsv(lastTest.label),
      escapeCsv(lastError),
      escapeCsv(latestStatus),
      escapeCsv(latestFinished),
      escapeCsv(latestItems),
      escapeCsv(latestDuration),
    ].join(',');
  });

  return [header, ...lines].join('\n');
}
