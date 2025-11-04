import { z } from 'zod';

import type { SyncCatalogSummary } from './moscotSync';

export const VendorSyncModeSchema = z.enum(['dryRun', 'apply']);
export type VendorSyncMode = z.infer<typeof VendorSyncModeSchema>;

const BooleanishTrueValues = new Set(['1', 'true', 'yes', 'on']);
const BooleanishFalseValues = new Set(['0', 'false', 'no', 'off']);

const VendorSyncBodySchema = z
  .object({
    mode: z.string().optional(),
    dryRun: z.boolean().optional(),
    sourcePath: z.string().optional(),
    inject: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const VendorSyncQuerySchema = z.object({
  mode: z.string().optional(),
  dryRun: z.string().optional(),
});

export type VendorSyncRequest = {
  mode: VendorSyncMode;
  dryRun: boolean;
  sourcePath?: string;
  inject?: Array<Record<string, unknown>>;
};

export const VendorSyncSummarySchema = z.object({
  vendor: z.string(),
  sourcePath: z.string(),
  total: z.number(),
  created: z.number(),
  updated: z.number(),
  unchanged: z.number(),
  removed: z.number(),
  hash: z.string(),
  dryRun: z.boolean(),
  durationMs: z.number(),
  timestamp: z.string(),
  status: z.string().nullable(),
});

export type VendorSyncSummary = z.infer<typeof VendorSyncSummarySchema>;

export const VendorSyncSuccessResponseSchema = z.object({
  ok: z.literal(true),
  mode: VendorSyncModeSchema,
  runId: z.string().nullable(),
  summary: VendorSyncSummarySchema,
});

export type VendorSyncSuccessResponse = z.infer<typeof VendorSyncSuccessResponseSchema>;

function normalizeMode(value: unknown): VendorSyncMode | null {
  if (typeof value !== 'string') return null;
  const compact = value.toLowerCase().replace(/[^a-z]/g, '');
  if (compact === 'apply') return 'apply';
  if (compact === 'dryrun') return 'dryRun';
  return null;
}

function parseBooleanish(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (BooleanishTrueValues.has(normalized)) return true;
  if (BooleanishFalseValues.has(normalized)) return false;
  return null;
}

export function parseVendorSyncRequest(input: {
  url: string;
  body: unknown;
}): VendorSyncRequest {
  const url = new URL(input.url);
  const query = VendorSyncQuerySchema.parse({
    mode: url.searchParams.get('mode') ?? undefined,
    dryRun: url.searchParams.get('dryRun') ?? undefined,
  });

  const bodyResult = VendorSyncBodySchema.parse(input.body ?? {});

  const bodyMode = normalizeMode(bodyResult.mode);
  const queryMode = normalizeMode(query.mode);

  const bodyDryRun = bodyResult.dryRun ?? null;
  const queryDryRun = parseBooleanish(query.dryRun);

  let mode: VendorSyncMode = 'dryRun';

  if (bodyMode) {
    mode = bodyMode;
  } else if (queryMode) {
    mode = queryMode;
  } else if (bodyDryRun !== null) {
    mode = bodyDryRun ? 'dryRun' : 'apply';
  } else if (queryDryRun !== null) {
    mode = queryDryRun ? 'dryRun' : 'apply';
  }

  const dryRun = mode === 'dryRun';
  const sourcePath =
    typeof bodyResult.sourcePath === 'string' && bodyResult.sourcePath.trim().length > 0
      ? bodyResult.sourcePath.trim()
      : undefined;

  const inject = Array.isArray(bodyResult.inject) ? bodyResult.inject : undefined;

  return {
    mode,
    dryRun,
    sourcePath,
    inject,
  };
}

export function formatVendorSyncSummary(summary: SyncCatalogSummary): VendorSyncSummary {
  return {
    vendor: summary.vendor,
    sourcePath: summary.sourcePath,
    total: summary.total,
    created: summary.created,
    updated: summary.updated,
    unchanged: summary.unchanged,
    removed: summary.removed,
    hash: summary.hash,
    dryRun: summary.dryRun,
    durationMs: summary.durationMs,
    timestamp: summary.timestamp,
    status: summary.status ?? null,
  };
}
