'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

import { vendorLabel } from '@/lib/catalog/vendorSlugs';
import { cn } from '@/lib/utils';
import {
  type VendorHistoryEntry,
  useVendorSyncHistory,
} from '@/hooks/useVendorSyncHistory';

const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;
const IDLE_BLOCK = '─';

type TrendBlocksContentProps = {
  histories: VendorHistoryEntry[];
  loading: boolean;
  error: string | null;
  className?: string;
};

type SparklineCell = {
  char: string;
  tone: 'success' | 'error' | 'running' | 'muted';
  label: string;
};

function statusTone(status: string): SparklineCell['tone'] {
  if (status === 'success') return 'success';
  if (status === 'error' || status === 'failed') return 'error';
  if (status === 'running') return 'running';
  return 'muted';
}

function toneClass(tone: SparklineCell['tone']): string {
  if (tone === 'success') return 'text-emerald-600 dark:text-emerald-300';
  if (tone === 'error') return 'text-destructive';
  if (tone === 'running') return 'text-[hsl(var(--accent-blue))]';
  return 'text-muted-foreground';
}

export function buildSparklineCells(runs: VendorHistoryEntry['runs']): SparklineCell[] {
  if (!runs.length) return [];
  const maxDuration = runs.reduce((acc, run) => {
    if (typeof run.durationMs === 'number' && run.durationMs > acc) {
      return run.durationMs;
    }
    return acc;
  }, 0);

  return runs.map((run) => {
    const tone = statusTone(run.status);
    let char = IDLE_BLOCK;
    if (typeof run.durationMs === 'number' && run.durationMs > 0 && maxDuration > 0) {
      const ratio = Math.min(1, run.durationMs / maxDuration);
      const index = Math.min(BLOCKS.length - 1, Math.max(0, Math.round(ratio * (BLOCKS.length - 1))));
      char = BLOCKS[index];
    } else if (run.status === 'running') {
      char = '▸';
    }

    const durationLabel =
      typeof run.durationMs === 'number' && run.durationMs > 0
        ? `${Math.round(run.durationMs / 1000)}s`
        : 'Ukendt varighed';

    const statusLabel =
      run.status === 'success'
        ? 'Fuldført'
        : run.status === 'error'
          ? 'Fejlet'
          : run.status === 'running'
            ? 'I gang'
            : 'Ukendt';

    return {
      char,
      tone,
      label: `${statusLabel} · ${durationLabel}`,
    } satisfies SparklineCell;
  });
}

export function TrendBlocksContent({ histories, loading, error, className }: TrendBlocksContentProps) {
  const rows = useMemo(() => {
    return histories.map((entry) => {
      const cells = buildSparklineCells(entry.runs);
      const success = entry.runs.filter((run) => run.status === 'success').length;
      const failed = entry.runs.filter((run) => run.status === 'error').length;
      const running = entry.runs.filter((run) => run.status === 'running').length;
      return {
        vendor: entry.vendor,
        label: vendorLabel(entry.vendor),
        cells,
        counts: { success, failed, running },
      };
    });
  }, [histories]);

  return (
    <section
      className={cn(
        'rounded-3xl border border-white/20 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[hsl(var(--surface))]/70',
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Trend pr. leverandør</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Indlæser kørsler…' : 'Seneste historik pr. leverandør'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {rows.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
            Ingen historik tilgængelig.
          </div>
        ) : null}

        {rows.map((row) => (
          <div
            key={row.vendor}
            className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                {row.label}
              </span>
              <span className="text-muted-foreground">
                Seneste {row.cells.length} kørsler
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 font-mono text-lg">
              {row.cells.length === 0 ? (
                <span className="text-muted-foreground">Ingen data</span>
              ) : (
                row.cells.map((cell, idx) => (
                  <span
                    key={`${row.vendor}-${idx}`}
                    aria-label={cell.label}
                    className={cn('transition-colors', toneClass(cell.tone))}
                  >
                    {cell.char}
                  </span>
                ))
              )}
            </div>

            <div className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              ✔︎ {row.counts.success} · ✖︎ {row.counts.failed} · ▹ {row.counts.running}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type TrendBlocksProps = {
  className?: string;
  limit?: number;
};

export default function TrendBlocks({ className, limit }: TrendBlocksProps) {
  const { histories, isLoading, error } = useVendorSyncHistory({ limit, enabled: true });

  return (
    <TrendBlocksContent
      className={className}
      histories={histories}
      loading={isLoading}
      error={error?.message ?? null}
    />
  );
}

export type { TrendBlocksContentProps, SparklineCell };

