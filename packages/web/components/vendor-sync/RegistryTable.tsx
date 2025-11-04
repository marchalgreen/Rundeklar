'use client';

import { Loader2 } from 'lucide-react';
import {
  CheckCircle,
  FunnelSimple,
  MagnifyingGlass,
  Plugs,
  Warning,
  XCircle,
} from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';

import type { SerializedVendorIntegration, VendorRegistryRow } from './RegistryWindow';

type RegistryTableProps = {
  rows: VendorRegistryRow[];
  loading: boolean;
  refreshing: boolean;
  testingSlug: string | null;
  onRowSelect: (slug: string) => void;
  onTest: (slug: string) => void;
};

function IntegrationTypeBadge({ integration }: { integration: SerializedVendorIntegration }) {
  const label = integration.type === 'SCRAPER' ? 'Scraper' : 'API';
  return (
    <Badge variant="muted" className="inline-flex items-center gap-1">
      <FunnelSimple size={14} weight="bold" aria-hidden />
      {label}
    </Badge>
  );
}

function IntegrationStatus({ integration }: { integration: SerializedVendorIntegration | null }) {
  if (!integration) {
    return (
      <Badge variant="danger" className="inline-flex items-center gap-1">
        <XCircle size={14} weight="fill" aria-hidden />
        Ikke konfigureret
      </Badge>
    );
  }

  if (!integration.lastTestAt) {
    return (
      <Badge variant="muted" className="inline-flex items-center gap-1">
        <Warning size={14} weight="fill" aria-hidden />
        Ikke testet
      </Badge>
    );
  }

  if (integration.lastTestOk === false) {
    return (
      <Badge variant="danger" className="inline-flex items-center gap-1">
        <XCircle size={14} weight="fill" aria-hidden />
        Seneste test fejlede
      </Badge>
    );
  }

  return (
    <Badge variant="ok" className="inline-flex items-center gap-1">
      <CheckCircle size={14} weight="fill" aria-hidden />
      Seneste test godkendt
    </Badge>
  );
}

function LastTestLabel({ integration }: { integration: SerializedVendorIntegration | null }) {
  if (!integration) return <span className="text-xs text-muted-foreground">Ingen integration</span>;
  const timestamp = integration.lastTestAt
    ? formatVendorSyncDate(integration.lastTestAt)
    : 'Ingen testdata';
  return <span className="text-xs text-muted-foreground">Seneste test: {timestamp}</span>;
}

function SyncSummary({
  totalItems,
  lastRunAt,
  lastDurationMs,
  lastError,
}: {
  totalItems: number | null;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
}) {
  if (!lastRunAt && !totalItems && !lastDurationMs) {
    return <span className="text-xs text-muted-foreground">Ingen kørsel registreret</span>;
  }

  const itemsLabel =
    typeof totalItems === 'number'
      ? `${new Intl.NumberFormat('da-DK').format(totalItems)} produkter`
      : 'Ukendt antal';

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {formatVendorSyncDate(lastRunAt)}
        </span>
        {lastError ? (
          <Badge variant="danger" className="inline-flex items-center gap-1">
            <XCircle size={14} weight="fill" aria-hidden />
            Fejl
          </Badge>
        ) : (
          <Badge variant="ok" className="inline-flex items-center gap-1">
            <CheckCircle size={14} weight="fill" aria-hidden />
            Succes
          </Badge>
        )}
      </div>
      <span className="block text-xs text-muted-foreground">
        {itemsLabel}
        {lastDurationMs != null ? ` · Varighed ${formatVendorSyncDuration(lastDurationMs)}` : ''}
      </span>
      {lastError ? (
        <span className="block text-xs text-destructive" title={lastError}>
          {lastError}
        </span>
      ) : null}
    </div>
  );
}

export default function RegistryTable({
  rows,
  loading,
  refreshing,
  testingSlug,
  onRowSelect,
  onTest,
}: RegistryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl">
      <table className="min-w-full border-separate border-spacing-y-1">
        <thead className="bg-white/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[hsl(var(--surface))]/60">
          <tr>
            <th className="px-6 py-3">Leverandør</th>
            <th className="px-6 py-3">Integration</th>
            <th className="px-6 py-3">Seneste synk</th>
            <th className="px-6 py-3">Sidste test</th>
            <th className="px-6 py-3 text-right">Handlinger</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                Ingen leverandører fundet.
              </td>
            </tr>
          ) : null}

          {rows.map((row) => {
            const { vendor, state } = row;
            const integration = vendor.integration;
            const isTesting = testingSlug === vendor.slug;

            return (
              <tr
                key={vendor.id}
                className={cn(
                  'rounded-2xl border border-[hsl(var(--line))]/60 bg-white/80 text-sm shadow-sm transition hover:-translate-y-[1px] hover:bg-white/95 dark:bg-[hsl(var(--surface))]/80 dark:hover:bg-[hsl(var(--surface))]/95',
                  refreshing ? 'opacity-75' : '',
                )}
              >
                <td className="rounded-l-xl px-6 py-4 align-top">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">{vendor.name}</div>
                    <div className="text-xs text-muted-foreground">/{vendor.slug}</div>
                    {/* renamed to avoid Playwright strict-mode conflict with the primary "Detaljer" button */}
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => onRowSelect(vendor.slug)}
                      aria-label={`Åbn info for ${vendor.name}`}
                    >
                      Se info
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {integration ? <IntegrationTypeBadge integration={integration} /> : null}
                      <IntegrationStatus integration={integration} />
                    </div>
                    <LastTestLabel integration={integration} />
                  </div>
                </td>
                <td className="px-6 py-4 align-top">
                  {state ? (
                    <SyncSummary
                      totalItems={state.totalItems ?? null}
                      lastRunAt={state.lastRunAt ?? null}
                      lastDurationMs={state.lastDurationMs ?? null}
                      lastError={state.lastError ?? null}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Ingen kørsel registreret</span>
                  )}
                </td>
                <td className="px-6 py-4 align-top">
                  <LastTestLabel integration={integration} />
                </td>
                <td className="rounded-r-xl px-6 py-4 align-top">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      size="pill"
                      variant="soft"
                      disabled={isTesting}
                      onClick={() => onTest(vendor.slug)}
                    >
                      {isTesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plugs size={16} weight="bold" />
                      )}
                      Test forbindelse
                    </Button>
                    <Button
                      type="button"
                      size="pill"
                      variant="soft"
                      onClick={() => onRowSelect(vendor.slug)}
                    >
                      <MagnifyingGlass size={16} weight="bold" />
                      Detaljer
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
