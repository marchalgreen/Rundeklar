'use client';

import { useMemo } from 'react';
import type { TooltipProps } from 'recharts';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

import VendorSyncObservabilityCard from '@/components/inventory/Observability/VendorSyncObservabilityCard';
import VendorSyncDashboardCard from './VendorSyncDashboardCard';
import { DEFAULT_VENDOR_NAME, DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

import {
  compute30DayTrend,
  computeKPIs,
  computeStockHealth,
  type TrendPoint,
} from '@/lib/analytics/inventory';
import { useInventory } from '@/store/inventory';
import { useInventoryMovements } from '@/store/inventoryMovements';
import { useInventoryView } from '@/store/inventoryView';
import { hslVar, TOKENS } from '@/lib/ui/palette';

const RING_SEGMENTS = [
  { key: 'inStock', label: 'På lager', colorVar: TOKENS.ok },
  { key: 'low', label: 'Lav', colorVar: TOKENS.warn },
  { key: 'critical', label: 'Udsolgt', colorVar: TOKENS.danger },
] as const;

const PIE_PERCENT_FORMATTER = new Intl.NumberFormat('da-DK', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

type RingSegmentKey = (typeof RING_SEGMENTS)[number]['key'];

type PieTooltipPayload = {
  payload?: { label: string; value: number; pct?: number };
};

type PieTooltipProps = {
  active?: boolean;
  payload?: PieTooltipPayload[];
};

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <div className="rounded-lg border border-white/30 bg-white/80 px-2 py-1 text-xs shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[hsl(var(--surface))]/80">
      <div className="font-medium text-foreground">{entry.label}</div>
      <div className="text-muted">
        {entry.value} SKU’er
        {typeof entry.pct === 'number' ? (
          <span className="ml-1 opacity-80">· {PIE_PERCENT_FORMATTER.format(entry.pct)}</span>
        ) : null}
      </div>
    </div>
  );
}

type TrendTooltipProps = TooltipProps<number, string> & {
  numberFormatter: Intl.NumberFormat;
};

function TrendTooltip({ active, payload, label, numberFormatter }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as (TrendPoint & { label?: string }) | undefined;
  if (!point) return null;

  const displayLabel = typeof label === 'string' && label.length ? label : point.label;

  return (
    <div className="min-w-[160px] rounded-xl border border-white/30 bg-white/85 p-3 text-xs shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[hsl(var(--surface))]/80">
      <div className="text-xs font-medium text-foreground">{displayLabel}</div>
      <div className="mt-1 grid gap-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Netto</span>
          <span className={point.net >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
            {point.net >= 0 ? '+' : ''}
            {numberFormatter.format(point.net)} stk.
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Tilgang</span>
          <span>+{numberFormatter.format(point.inbound)} stk.</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Afgang</span>
          <span>-{numberFormatter.format(point.outbound)} stk.</span>
        </div>
      </div>
    </div>
  );
}

export default function InventoryDashboard() {
  const items = useInventory((s) => s.items);
  const lowThreshold = useInventoryView((s) => s.stock.lowThreshold);
  const movements = useInventoryMovements((s) => s.entries);
  const { setStock, toggleFacet, clearFacet, resetFilters } = useInventoryView.getState();

  const numberFormatter = useMemo(() => new Intl.NumberFormat('da-DK'), []);
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat('da-DK', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('da-DK', {
        day: '2-digit',
        month: 'short',
      }),
    [],
  );

  const stockHealth = useMemo(
    () => computeStockHealth(items, { lowThreshold }),
    [items, lowThreshold],
  );
  const kpis = useMemo(
    () => computeKPIs(items, { lowThreshold }),
    [items, lowThreshold],
  );
  const trend = useMemo(() => compute30DayTrend(movements), [movements]);
  const trendData = useMemo(
    () =>
      trend.map((point) => ({
        ...point,
        label: dateFormatter.format(new Date(`${point.date}T00:00:00`)),
      })),
    [trend, dateFormatter],
  );

  const trendNetTotal = useMemo(
    () => trend.reduce((acc, point) => acc + point.net, 0),
    [trend],
  );

  const yDomain = useMemo(() => {
    if (!trend.length) return [-5, 5];
    const values = trend.map((point) => point.net);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const padding = Math.max(2, Math.round((max - min) * 0.1));
    return [min - padding, max + padding];
  }, [trend]);

  const ringData = useMemo(() => {
    const total = Math.max(1, stockHealth.total);
    return RING_SEGMENTS.map((segment) => {
      const value = stockHealth[segment.key as RingSegmentKey];
      const pct = value / total;
      return {
        key: segment.key,
        label: segment.label,
        value,
        pct,
        color: hslVar(segment.colorVar),
        colorSoft: hslVar(segment.colorVar, 0.18),
      };
    });
  }, [stockHealth]);

  const noteLines = useMemo(() => {
    const lines: string[] = [];
    if (kpis.critical.count > 0) {
      lines.push(`${kpis.critical.count} udsolgte SKU’er kræver opmærksomhed.`);
    } else {
      lines.push('Ingen udsolgte SKU’er i øjeblikket.');
    }
    if (kpis.low.count > 0) {
      lines.push(`${kpis.low.count} ligger under lavt lager (${lowThreshold} stk.).`);
    }
    if (trendNetTotal < 0) {
      lines.push('Netto bevægelse de sidste 30 dage er negativ — overvej genbestilling.');
    } else if (trendNetTotal > 0) {
      lines.push('Stigende netto lager de sidste 30 dage.');
    }
    return lines;
  }, [kpis, lowThreshold, trendNetTotal]);

  return (
    <div className="win-frame card-glass-active rounded-2xl p-4" data-active>
      <header className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inventory Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overblik over lagerstatus og bevægelser</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/25 bg-white/40 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] dark:border-white/10 dark:bg-[hsl(var(--surface))]/55 dark:hover:bg-[hsl(var(--surface))]/70"
            onClick={() => resetFilters()}
            aria-label="Ryd alle filtre"
          >
            Ryd filtre
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
            <TrendingUp className="h-4 w-4 text-[hsl(var(--accent-blue))]" />
            <span>30 dages nettobevægelse</span>
            <span className={trendNetTotal >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
              {trendNetTotal >= 0 ? '+' : ''}
              {numberFormatter.format(trendNetTotal)} stk.
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
          <h3 className="text-sm font-medium text-foreground">Inventory Health</h3>
          <p className="text-xs text-muted-foreground">Fordeling af SKU’er efter lagerstatus</p>
          <div className="mt-5">
            {stockHealth.total === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                Ingen varer indlæst endnu.
              </div>
            ) : (
              <div className="relative">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ringData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="65%"
                        outerRadius="90%"
                        startAngle={90}
                        endAngle={-270}
                        stroke="transparent"
                        cornerRadius={12}
                        paddingAngle={2}
                        aria-label="Lagerstatus fordelt på segmenter"
                      >
                        {ringData.map((segment) => (
                          <Cell
                            key={segment.key}
                            fill={segment.color}
                            className="cursor-pointer transition-[opacity,stroke-dashoffset] duration-150 ease-out focus:outline-none"
                            style={{ strokeDasharray: '4 2', strokeDashoffset: 0 }}
                            onClick={() => {
                              if (segment.key === 'inStock') setStock('in');
                              if (segment.key === 'low') setStock('low');
                              if (segment.key === 'critical') setStock('out');
                            }}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              if (segment.key === 'inStock') setStock('in');
                              if (segment.key === 'low') setStock('low');
                              if (segment.key === 'critical') setStock('out');
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Totalt</span>
                  <span className="text-3xl font-semibold text-foreground">
                    {numberFormatter.format(stockHealth.total)}
                  </span>
                  <span className="text-xs text-muted-foreground">SKU’er</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {ringData.map((seg) => (
              <button
                key={seg.key}
                type="button"
                className="group flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-xs transition focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35]"
                style={{
                  background: seg.colorSoft,
                  borderColor: 'hsl(var(--line)/0.55)',
                }}
                onClick={() => {
                  if (seg.key === 'inStock') setStock('in');
                  if (seg.key === 'low') setStock('low');
                  if (seg.key === 'critical') setStock('out');
                }}
                aria-label={`Filtrér: ${seg.label}`}
              >
                <span className="flex flex-1 items-center gap-2 whitespace-nowrap truncate">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-medium text-foreground truncate">{seg.label}</span>
                </span>
                <span className="ml-3 shrink-0 whitespace-nowrap tabular-nums text-foreground">
                  {numberFormatter.format(seg.value)} · {percentFormatter.format(seg.pct)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <VendorSyncDashboardCard
            vendor={DEFAULT_VENDOR_SLUG}
            vendorLabel={`${DEFAULT_VENDOR_NAME} katalog`}
            pollIntervalMs={90_000}
            className="sm:col-span-2"
          />
          {[{
            key: 'critical',
            title: 'Kritiske SKU’er',
            value: numberFormatter.format(kpis.critical.count),
            description:
              kpis.critical.count > 0
                ? 'Udsolgte varer – prioriter genbestilling'
                : 'Ingen udsolgte varer',
          },
          {
            key: 'low',
            title: 'Lavt lager',
            value: numberFormatter.format(kpis.low.count),
            description:
              kpis.low.count > 0
                ? `Under tærskel (${lowThreshold})`
                : 'Alle over tærskel',
          },
          {
            key: 'aging',
            title: 'Aldrende varer',
            value: numberFormatter.format(kpis.aging.count),
            description: 'Ikke opdateret de sidste 180 dage',
          },
          {
            key: 'topBrand',
            title: 'Topbrand',
            value: kpis.topBrand ? kpis.topBrand.brand : '—',
            description: kpis.topBrand
              ? `${percentFormatter.format(kpis.topBrand.share)} af kataloget`
              : 'Ingen branddata',
          }].map((card) => (
            <div
              key={card.key}
              className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] dark:border-white/10 dark:bg-[hsl(var(--surface))]/70"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (card.key === 'critical') setStock('out');
                if (card.key === 'low') setStock('low');
                if (card.key === 'topBrand' && kpis.topBrand) {
                  clearFacet('brand');
                  toggleFacet('brand', kpis.topBrand.brand);
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (card.key === 'critical') setStock('out');
                if (card.key === 'low') setStock('low');
                if (card.key === 'topBrand' && kpis.topBrand) {
                  clearFacet('brand');
                  toggleFacet('brand', kpis.topBrand.brand);
                }
              }}
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {card.title}
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{card.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">30 dages bevægelse</h3>
              <p className="text-xs text-muted-foreground">Daglig nettobevægelse baseret på registreringer</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Nettotal: {trendNetTotal >= 0 ? '+' : ''}
              {numberFormatter.format(trendNetTotal)} stk.
            </div>
          </div>
          <div className="mt-4 h-64">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Ingen bevægelser registreret de sidste 30 dage.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line)/0.5)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={3} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    domain={yDomain as [number, number]}
                    tickFormatter={(v) => numberFormatter.format(Math.round(v))}
                    allowDecimals={false}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" />
                  <Tooltip content={<TrendTooltip numberFormatter={numberFormatter} />} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke={`hsl(var(${TOKENS.accentBlue}))`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70">
          <h3 className="text-sm font-medium text-foreground">Top brands</h3>
          <p className="text-xs text-muted-foreground">Fordeling blandt de mest repræsenterede brands</p>
          <ul className="mt-4 space-y-3">
            {kpis.topBrands.length === 0 ? (
              <li className="text-sm text-muted-foreground">Ingen branddata tilgængelig.</li>
            ) : (
              kpis.topBrands.map((brand) => (
                <li
                  key={brand.brand}
                  className="space-y-1 cursor-pointer rounded-md px-1 py-0.5 transition hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35]"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    clearFacet('brand');
                    toggleFacet('brand', brand.brand);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    clearFacet('brand');
                    toggleFacet('brand', brand.brand);
                  }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{brand.brand}</span>
                    <span className="text-xs text-muted-foreground">
                      {numberFormatter.format(brand.count)} SKU’er · {percentFormatter.format(brand.share)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/50 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: `hsl(var(${TOKENS.accentBlue}))`,
                        width: `${Math.min(100, Math.round(brand.share * 100))}%`,
                      }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            {noteLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <VendorSyncObservabilityCard
          vendor={DEFAULT_VENDOR_SLUG}
          vendorLabel={`${DEFAULT_VENDOR_NAME} katalog`}
          limit={8}
          pollIntervalMs={90_000}
        />
      </section>
    </div>
  );
}
