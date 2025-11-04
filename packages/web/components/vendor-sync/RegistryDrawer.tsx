'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  ArrowsClockwise,
  CheckCircle,
  FunnelSimple,
  Plugs,
  Warning,
  XCircle,
} from '@phosphor-icons/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatVendorSyncDate, formatVendorSyncDuration } from '@/lib/catalog/vendorSyncFormatting';

import type {
  VendorRegistryRow,
  VendorTestOptions,
  VendorCredentialPayload,
  SerializedVendorIntegration,
} from './RegistryWindow';

type RegistryDrawerProps = {
  open: boolean;
  row: VendorRegistryRow | null;
  testing: boolean;
  saving: boolean;
  onOpenChange: (next: boolean) => void;
  onTest: (slug: string, options?: VendorTestOptions) => void;
  onSaveCredentials: (slug: string, payload: VendorCredentialPayload) => void;
};

type IntegrationStatusMeta = {
  label: string;
  variant: 'ok' | 'danger' | 'muted';
  icon: ReactNode;
};

function resolveIntegrationStatus(
  integration: SerializedVendorIntegration | null,
): IntegrationStatusMeta {
  if (!integration) {
    return {
      label: 'Ikke konfigureret',
      variant: 'danger',
      icon: <XCircle size={14} weight="fill" aria-hidden />,
    };
  }
  if (!integration.lastTestAt) {
    return {
      label: 'Ikke testet',
      variant: 'muted',
      icon: <Warning size={14} weight="fill" aria-hidden />,
    };
  }
  if (integration.lastTestOk === false) {
    return {
      label: 'Seneste test fejlede',
      variant: 'danger',
      icon: <XCircle size={14} weight="fill" aria-hidden />,
    };
  }
  return {
    label: 'Seneste test godkendt',
    variant: 'ok',
    icon: <CheckCircle size={14} weight="fill" aria-hidden />,
  };
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('da-DK').format(value);
}

export default function RegistryDrawer({
  open,
  row,
  testing,
  saving,
  onOpenChange,
  onTest,
  onSaveCredentials,
}: RegistryDrawerProps) {
  const integration = row?.vendor.integration ?? null;

  const [sourcePath, setSourcePath] = useState('');
  const [scraperPath, setScraperPath] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (!row) return;
    setSourcePath('');
    setScraperPath(row.vendor.integration?.scraperPath ?? '');
    setApiBaseUrl(row.vendor.integration?.apiBaseUrl ?? '');
    setApiKey(row.vendor.integration?.apiKey ?? '');
  }, [row]);

  const statusMeta = useMemo(() => resolveIntegrationStatus(integration), [integration]);

  const handleTest = () => {
    if (!row) return;
    const payload: VendorTestOptions = {};
    if (sourcePath.trim().length) {
      payload.sourcePath = sourcePath.trim();
    }
    onTest(row.vendor.slug, payload);
  };

  const handleSave = () => {
    if (!row?.vendor.integration) return;
    const payload: VendorCredentialPayload = {};
    if (row.vendor.integration.type === 'SCRAPER') {
      payload.scraperPath = scraperPath.trim().length ? scraperPath.trim() : null;
    } else if (row.vendor.integration.type === 'API') {
      payload.apiBaseUrl = apiBaseUrl.trim().length ? apiBaseUrl.trim() : null;
      payload.apiKey = apiKey.trim().length ? apiKey.trim() : null;
    } else {
      payload.scraperPath = scraperPath.trim().length ? scraperPath.trim() : null;
    }
    onSaveCredentials(row.vendor.slug, payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        maxWidthClassName="sm:max-w-2xl"
        className="space-y-6 rounded-3xl border-[hsl(var(--line))] bg-white/85 shadow-xl backdrop-blur"
      >
        {row ? (
          <>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-semibold text-foreground">
                {row.vendor.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                /{row.vendor.slug}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {integration ? (
                  <Badge variant="muted" className="inline-flex items-center gap-1">
                    <FunnelSimple size={14} weight="bold" aria-hidden />
                    {integration.type === 'SCRAPER' ? 'Scraper' : 'API'}
                  </Badge>
                ) : null}
                <Badge variant={statusMeta.variant} className="inline-flex items-center gap-1">
                  {statusMeta.icon}
                  {statusMeta.label}
                </Badge>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--line))]/60 bg-white/60 p-4 text-xs text-muted-foreground backdrop-blur-sm">
                <p>
                  {integration?.lastTestAt
                    ? `Seneste test: ${formatVendorSyncDate(integration.lastTestAt)}`
                    : 'Ingen testdata tilgængelig'}
                </p>
                {integration?.lastTestAt && integration?.meta ? (
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatNumber(
                      (integration.meta as Record<string, unknown>)?.totalItems as number | null,
                    )}{' '}
                    produkter i seneste test
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Forbindelsestest</h3>
                <Button
                  type="button"
                  variant="tahoe"
                  size="pill"
                  onClick={handleTest}
                  disabled={!integration || testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowsClockwise size={16} weight="bold" />
                  )}
                  Kør test
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-source-override">Kildesti (valgfri)</Label>
                <Input
                  id="vendor-source-override"
                  value={sourcePath}
                  onChange={(event) => setSourcePath(event.target.value)}
                  placeholder="s3://bucket/fil.json"
                  className="tahoe-input h-10 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Angiv en alternativ sti for testen. Feltet kan efterlades tomt for at bruge
                  standardkonfigurationen.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Legitimationsoplysninger</h3>

              {integration?.type === 'SCRAPER' ? (
                <div className="space-y-2">
                  <Label htmlFor="vendor-scraper-path">Standard kilde</Label>
                  <Input
                    id="vendor-scraper-path"
                    value={scraperPath}
                    onChange={(event) => setScraperPath(event.target.value)}
                    placeholder="s3://vendor-sync/moscot/catalog.json"
                    className="tahoe-input h-10 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
                  />
                </div>
              ) : null}

              {integration?.type === 'API' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor-api-base">API base URL</Label>
                    <Input
                      id="vendor-api-base"
                      value={apiBaseUrl}
                      onChange={(event) => setApiBaseUrl(event.target.value)}
                      placeholder="https://api.vendor.test/catalog"
                      className="tahoe-input h-10 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-api-key">API nøgle</Label>
                    <Input
                      id="vendor-api-key"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="••••••••"
                      className="tahoe-input h-10 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
                    />
                  </div>
                </div>
              ) : null}

              {!integration ? (
                <Alert variant="destructive" className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <AlertTitle>Ingen integration</AlertTitle>
                    <AlertDescription>
                      Denne leverandør har ikke en konfigureret integration. Tilføj en integration
                      før du kan opdatere legitimationsoplysninger.
                    </AlertDescription>
                  </div>
                </Alert>
              ) : null}
            </div>

            <div className="space-y-3 rounded-2xl border border-[hsl(var(--line))]/60 bg-white/60 p-4 text-xs text-muted-foreground backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-foreground">Seneste synkronisering</h3>
              {row.state ? (
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-foreground">Dato</dt>
                    <dd>{formatVendorSyncDate(row.state.lastRunAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Varighed</dt>
                    <dd>{formatVendorSyncDuration(row.state.lastDurationMs)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Produkter</dt>
                    <dd>{formatNumber(row.state.totalItems)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Kilde</dt>
                    <dd>{row.state.lastSource ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Hash</dt>
                    <dd>{row.state.lastHash ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Kørt af</dt>
                    <dd>{row.state.lastRunBy ?? '—'}</dd>
                  </div>
                </dl>
              ) : (
                <p>Ingen synkroniseringer registreret endnu.</p>
              )}
              {row.state?.lastError ? (
                <Alert variant="destructive" className="flex items-start gap-3 text-left">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <AlertTitle>Fejl under synkronisering</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap break-words">
                      {row.state.lastError}
                    </AlertDescription>
                  </div>
                </Alert>
              ) : null}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Ingen leverandør valgt.</div>
        )}

        {row ? (
          <DialogFooter>
            <Button
              type="button"
              variant="soft"
              size="pill"
              onClick={() => onOpenChange(false)}
              disabled={saving || testing}
            >
              Annuller
            </Button>
            <Button
              type="button"
              variant="soft"
              size="pill"
              onClick={handleSave}
              disabled={!integration || saving}
              aria-label="Gem" // <-- ensures accessible name is exactly "Gem"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plugs size={16} weight="bold" />
              )}
              {/* Visible label kept short to match the test */}
              Gem
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
