'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, Play, Sparkles } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_VENDOR_SLUG, vendorLabel } from '@/lib/catalog/vendorSlugs';

type DiffCounts = {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
};

type ProductSnapshot = {
  id: string | null;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  sizeLabel: string | null;
  usage: string | null;
  catalogUrl: string | null;
  supplier: string | null;
};

type ProductChange = {
  field: keyof ProductSnapshot | string;
  before: unknown;
  after: unknown;
};

type StockChange = {
  storeStockId: string;
  storeId: string;
  before: { qty: number; barcode: string | null };
  after: { qty: number; barcode: string | null };
  changed: boolean;
};

type DiffItem = {
  catalogId: string;
  status: 'new' | 'updated' | 'unchanged';
  product: {
    before: ProductSnapshot | null;
    after: ProductSnapshot;
    changes: ProductChange[];
  };
  stocks: StockChange[];
  normalized: Record<string, unknown> & { catalogId: string };
};

type RemovedItem = {
  catalogId: string;
  productId: string | null;
  sku: string | null;
  stocks: Array<{ storeStockId: string; storeId: string; qty: number; barcode: string | null }>;
};

type PreviewApplyResponse = {
  ok: true;
  vendor: string;
  mode: 'preview' | 'apply';
  dryRun: boolean;
  meta: { type: 'sourcePath' | 'inline' | 'unknown'; value?: string; count?: number };
  normalizedCount: number;
  diff: {
    hash: string;
    counts: DiffCounts;
    items: DiffItem[];
    removed: RemovedItem[];
  };
  run: {
    runId: string;
    summary: {
      vendor: string;
      hash: string;
      total: number;
      created: number;
      updated: number;
      unchanged: number;
      removed: number;
      dryRun: boolean;
      durationMs: number;
      finishedAt: string;
      sourcePath: string | null;
    };
  };
};

type ErrorResponse = { ok: false; error: string; detail?: string | null };

type SubmitMode = 'preview' | 'apply';

const FieldLabels: Record<string, string> = {
  name: 'Navn',
  brand: 'Brand',
  model: 'Model',
  color: 'Farve',
  sizeLabel: 'Størrelse',
  usage: 'Brug',
  catalogUrl: 'Katalog URL',
  supplier: 'Leverandør',
};

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${Math.round(remainder)}s`;
}

function statusVariant(
  status: DiffItem['status'],
): 'default' | 'secondary' | 'success' | 'destructive' {
  if (status === 'new') return 'success';
  if (status === 'updated') return 'default';
  return 'secondary';
}

function statusLabel(status: DiffItem['status']) {
  if (status === 'new') return 'Ny';
  if (status === 'updated') return 'Opdateret';
  return 'Uændret';
}

function buildPayload(sourcePath: string, itemsJson: string) {
  const payload: Record<string, unknown> = {};
  const trimmedSource = sourcePath.trim();
  if (trimmedSource.length > 0) {
    payload.sourcePath = trimmedSource;
  }

  const trimmedItems = itemsJson.trim();
  if (trimmedItems.length > 0) {
    try {
      const parsed = JSON.parse(trimmedItems);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0) payload.items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        payload.items = [parsed];
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Ugyldigt JSON payload: ${detail}`);
    }
  }

  return payload;
}

function CountCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function VendorApplyWindow() {
  const [vendor, setVendor] = useState<string>(DEFAULT_VENDOR_SLUG);
  const [sourcePath, setSourcePath] = useState('');
  const [itemsJson, setItemsJson] = useState('');
  const [submitting, setSubmitting] = useState<SubmitMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewApplyResponse | null>(null);

  // useToast exposes typed helpers in this codebase
  const { success: showSuccess, error: showError } = useToast();

  const counts = result?.diff.counts;

  const catalogLabel = useMemo(() => vendorLabel(vendor), [vendor]);

  const handleSubmit = useCallback(
    async (mode: SubmitMode) => {
      if (submitting) return;
      setSubmitting(mode);
      setError(null);

      try {
        const payload = buildPayload(sourcePath, itemsJson);
        if (!payload.sourcePath && !payload.items) {
          throw new Error('Angiv enten Source Path eller JSON payload.');
        }

        const endpoint = `/api/catalog/vendor-sync/${encodeURIComponent(vendor)}/${
          mode === 'preview' ? 'preview' : 'apply'
        }`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = (await res.json()) as PreviewApplyResponse | ErrorResponse;
        if (!res.ok || !json || json.ok !== true) {
          const detail =
            (json as ErrorResponse)?.detail || (json as ErrorResponse)?.error || res.statusText;
          throw new Error(detail || 'Ukendt fejl under forespørgslen');
        }

        setResult(json);

        showSuccess(
          mode === 'preview' ? 'Preview klar' : 'Sync gennemført',
          {
            description:
              mode === 'preview'
                ? 'Gennemgå differencerne inden du anvender kataloget.'
                : 'Kataloget blev opdateret. Se detaljer i Observability vinduet.',
          },
        );
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        setError(detail);
        showError(mode === 'preview' ? 'Kunne ikke køre preview' : 'Anvendelse fejlede', {
          description: detail,
        });
      } finally {
        setSubmitting(null);
      }
    },
    [itemsJson, sourcePath, submitting, showError, showSuccess, vendor],
  );

  const handlePreview = useCallback(() => {
    void handleSubmit('preview');
  }, [handleSubmit]);

  const handleApply = useCallback(() => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Er du sikker på, at du vil anvende ændringerne på lageret?',
      );
      if (!confirmed) return;
    }
    void handleSubmit('apply');
  }, [handleSubmit]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border/60 bg-background/60 p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Preview & Apply</h2>
          <p className="text-sm text-muted-foreground">
            Indlæs normaliserede varer fra fil eller JSON, beregn differencer og opdater
            butikslageret.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vendor">Leverandør</Label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(event) => setVendor(event.target.value.trim().toLowerCase())}
              placeholder="moscot"
            />
            <p className="text-xs text-muted-foreground">
              Viser resultater for {catalogLabel} kataloget.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sourcePath">Source path (valgfri)</Label>
            <Input
              id="sourcePath"
              value={sourcePath}
              onChange={(event) => setSourcePath(event.target.value)}
              placeholder="s3://vendor-sync/moscot/catalog.json"
            />
            <p className="text-xs text-muted-foreground">
              Når angivet læses kataloget fra denne sti. JSON-feltet kan bruges til hurtige tests.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="itemsJson">JSON payload</Label>
          <Textarea
            id="itemsJson"
            rows={8}
            value={itemsJson}
            onChange={(event) => setItemsJson(event.target.value)}
            placeholder='[{ "catalogId": "LEMTOSH-BLACK", ... }]'
          />
          <p className="text-xs text-muted-foreground">
            Accepterer enten et array af rå vendor-payloads eller et enkelt objekt.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handlePreview} disabled={submitting !== null}>
            {submitting === 'preview' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Preview ændringer
          </Button>
          <Button onClick={handleApply} disabled={submitting !== null} variant="secondary">
            {submitting === 'apply' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Anvend til lager
          </Button>

          {submitting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {submitting === 'preview' ? 'Udregner differencer…' : 'Anvender kataloget…'}
            </div>
          )}
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Der opstod en fejl</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <section className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CountCard label="Total" value={counts?.total ?? 0} />
            <CountCard label="Nye" value={counts?.created ?? 0} />
            <CountCard label="Opdaterede" value={counts?.updated ?? 0} />
            <CountCard label="Uændrede" value={counts?.unchanged ?? 0} />
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Seneste {result.mode === 'preview' ? 'preview' : 'anvendelse'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Run ID <span className="font-mono text-foreground/80">{result.run.runId}</span>
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Afsluttet{' '}
                {new Intl.DateTimeFormat('da-DK', {
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                }).format(new Date(result.run.summary.finishedAt))}
              </div>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Kilde</dt>
                <dd className="text-sm text-foreground">{result.run.summary.sourcePath || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Hash</dt>
                <dd className="font-mono text-sm text-foreground/80">
                  {result.run.summary.hash || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Varighed</dt>
                <dd className="text-sm text-foreground">
                  {formatDuration(result.run.summary.durationMs)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Observability</dt>
                <dd className="text-sm">
                  <Link
                    href="/vendor-sync"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Åbn vinduet
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/60 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  Produkter ({result.diff.items.length})
                </h3>
                <Badge variant="outline">{result.diff.hash.slice(0, 12)}</Badge>
              </div>

              {result.diff.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ingen ændringer fundet i dette katalog.
                </p>
              ) : (
                <ScrollArea className="max-h-[420px] pr-2">
                  <div className="flex flex-col gap-3">
                    {result.diff.items.map((item) => {
                      const changeFields = item.product.changes.map(
                        (change) => FieldLabels[change.field as string] ?? change.field,
                      );
                      const stockChanges = item.stocks.filter((change) => change.changed);

                      return (
                        <div
                          key={item.catalogId}
                          className="rounded-lg border border-border/50 bg-background/80 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {item.catalogId}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.product.after.name}
                              </div>
                            </div>
                            <Badge variant={statusVariant(item.status)}>
                              {statusLabel(item.status)}
                            </Badge>
                          </div>

                          {changeFields.length > 0 && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              Ændrede felter: {changeFields.join(', ')}
                            </div>
                          )}

                          {stockChanges.length > 0 && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              Lageropdateringer: {stockChanges.length}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/60 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">Fjernede varer</h3>
                  <p className="text-xs text-muted-foreground">
                    Produkter som ikke længere findes i kataloget sættes til 0 på lager.
                  </p>
                </div>
              </div>

              {result.diff.removed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ingen produkter markeret som fjernet.
                </p>
              ) : (
                <ScrollArea className="max-h-[300px] pr-2">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.diff.removed.map((item) => (
                      <li
                        key={item.catalogId}
                        className="rounded-lg border border-border/40 bg-background/70 p-3"
                      >
                        <div className="font-medium text-foreground">{item.catalogId}</div>
                        <div className="text-xs">SKU: {item.sku ?? '—'}</div>
                        <div className="text-xs">Lagerlinjer: {item.stocks.length}</div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
