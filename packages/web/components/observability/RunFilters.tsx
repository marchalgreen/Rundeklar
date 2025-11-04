'use client';

import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';

import DatePopover from '@/components/ui/DatePopover';
import { cn } from '@/lib/utils';
import type { VendorSyncObservabilityStatusFilter } from '@/hooks/useVendorSyncObservability';
import { DEFAULT_VENDOR_SLUG, vendorLabel } from '@/lib/catalog/vendorSlugs';

const DATE_PRESETS = [
  { key: '7d', label: '7 dage', days: 7 },
  { key: '30d', label: '30 dage', days: 30 },
  { key: '90d', label: '90 dage', days: 90 },
  { key: 'all', label: 'Alle', days: null },
] as const;

const STATUS_OPTIONS: Array<{ value: VendorSyncObservabilityStatusFilter; label: string }> = [
  { value: 'success', label: 'Succes' },
  { value: 'failed', label: 'Fejlet' },
  { value: 'running', label: 'Kører' },
];

type RunFiltersChange = {
  vendor: string;
  from: Date | null;
  to: Date | null;
  status: VendorSyncObservabilityStatusFilter[];
};

type RunFiltersProps = RunFiltersChange & {
  vendorOptions?: Array<{ value: string; label: string }>;
  onChange: (filters: RunFiltersChange) => void;
};

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split('-');
  if (!yearStr || !monthStr || !dayStr) return null;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function detectPreset(from: Date | null, to: Date | null): (typeof DATE_PRESETS)[number]['key'] | 'custom' {
  if (!from || !to) return 'all';
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  const diffMs = end.valueOf() - start.valueOf();
  if (diffMs < 0) return 'custom';
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1;
  if (days === 7) return '7d';
  if (days === 30) return '30d';
  if (days === 90) return '90d';
  return 'custom';
}

function createPresetRange(days: number): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

export default function RunFilters({ vendor, from, to, status, vendorOptions, onChange }: RunFiltersProps) {
  const preset = useMemo(() => detectPreset(from, to), [from, to]);
  const vendors = vendorOptions && vendorOptions.length
    ? vendorOptions
    : [{ value: DEFAULT_VENDOR_SLUG, label: vendorLabel(DEFAULT_VENDOR_SLUG) }];

  const handleRangeChange = (nextFrom: Date | null, nextTo: Date | null) => {
    onChange({ vendor, from: nextFrom, to: nextTo, status });
  };

  const handlePresetClick = (key: (typeof DATE_PRESETS)[number]['key']) => {
    if (key === 'all') {
      onChange({ vendor, from: null, to: null, status });
      return;
    }
    const presetCfg = DATE_PRESETS.find((item) => item.key === key);
    if (!presetCfg || !presetCfg.days) return;
    const range = createPresetRange(presetCfg.days);
    onChange({ vendor, from: range.from, to: range.to, status });
  };

  const handleStatusToggle = (value: VendorSyncObservabilityStatusFilter) => {
    const exists = status.includes(value);
    const next = exists ? status.filter((entry) => entry !== value) : [...status, value];
    onChange({ vendor, from, to, status: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <CalendarRange className="h-4 w-4" />
            Tidsrum
          </span>
          <span>
            {from && to
              ? `${new Intl.DateTimeFormat('da-DK', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(from)} – ${new Intl.DateTimeFormat('da-DK', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(to)}`
              : 'Alle perioder'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((item) => {
            const active = preset === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handlePresetClick(item.key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] disabled:cursor-not-allowed',
                  active
                    ? 'border-[hsl(var(--accent-blue))/0.45] bg-[hsl(var(--accent-blue))/0.1] text-[hsl(var(--accent-blue))]'
                    : 'border-white/30 bg-white/60 text-foreground hover:bg-white/80 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:hover:bg-[hsl(var(--surface))]/75'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="font-medium text-muted-foreground" htmlFor="vendor-filter">
            Leverandør
          </label>
          <select
            id="vendor-filter"
            value={vendor}
            onChange={(event) => onChange({ vendor: event.target.value, from, to, status })}
            className="min-w-[10rem] rounded-xl border border-white/30 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35] dark:border-white/10 dark:bg-[hsl(var(--surface))]/70"
          >
            {vendors.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <DatePopover
            value={toDateInputValue(from)}
            onChange={(value) => handleRangeChange(parseDateInput(value), to)}
            renderLabel={(value) => <>Fra {value ? new Intl.DateTimeFormat('da-DK').format(new Date(value)) : 'vælg dato'}</>}
            triggerClassName="rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white/80 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:hover:bg-[hsl(var(--surface))]/75"
          />
          <DatePopover
            value={toDateInputValue(to)}
            onChange={(value) => handleRangeChange(from, parseDateInput(value))}
            renderLabel={(value) => <>Til {value ? new Intl.DateTimeFormat('da-DK').format(new Date(value)) : 'vælg dato'}</>}
            triggerClassName="rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white/80 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:hover:bg-[hsl(var(--surface))]/75"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Status</span>
        {STATUS_OPTIONS.map((option) => {
          const active = status.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusToggle(option.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))/0.35]',
                active
                  ? 'border-[hsl(var(--accent-blue))/0.45] bg-[hsl(var(--accent-blue))/0.12] text-[hsl(var(--accent-blue))]'
                  : 'border-white/25 bg-white/50 text-muted-foreground hover:bg-white/70 dark:border-white/10 dark:bg-[hsl(var(--surface))]/60 dark:text-muted-foreground dark:hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
