import { VendorSyncRunStatus } from '@prisma/client';
import { z } from 'zod';

import { DEFAULT_VENDOR_SLUG } from './vendorSlugs';

const VendorSyncRunStatusSchema = z.enum(['running', 'success', 'error']);

const PrismaStatuses = (VendorSyncRunStatus ?? {
  Pending: 'Pending',
  Success: 'Success',
  Failed: 'Failed',
}) as Record<string, string>;

const PendingStatus = PrismaStatuses.Pending?.toString?.() ?? 'Pending';
const SuccessStatus = PrismaStatuses.Success?.toString?.() ?? 'Success';
const FailedStatus = PrismaStatuses.Failed?.toString?.() ?? 'Failed';

export type NormalizedRun = {
  id: string;
  vendor: string;
  status: 'running' | 'success' | 'error';
  actor: string | null;
  dryRun: boolean;
  sourcePath: string | null;
  startedAt: string;
  completedAt: string | null;
  counts: {
    total: number | null;
    created: number | null;
    updated: number | null;
    removed: number | null;
    unchanged: number | null;
  };
  hash: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
  // included elsewhere; keep in the runtime contract
  durationMs: number | null;
};

function toUiStatus(status: unknown): 'running' | 'success' | 'error' {
  if (!status) return 'error';
  const raw = status.toString().toLowerCase();
  if (raw === SuccessStatus.toLowerCase()) return 'success';
  if (raw === FailedStatus.toLowerCase() || raw === 'error') return 'error';
  if (raw === PendingStatus.toLowerCase() || raw === 'running' || raw === 'in_progress') {
    return 'running';
  }
  return 'error';
}

export function normalizeRun(run: unknown, vendorDefault?: string): NormalizedRun {
  const r = run as {
    id: string;
    vendor?: string | null;
    status: VendorSyncRunStatus | string;
    actor?: string | null;
    dryRun?: boolean | null;
    sourcePath?: string | null;
    startedAt: Date;
    finishedAt?: Date | null;
    updatedAt: Date;
    hash?: string | null;
    error?: string | null;
    metadata?: Record<string, unknown> | null;
  } & Record<string, any>;
  return {
    id: r.id,
    vendor: r.vendor ?? vendorDefault ?? DEFAULT_VENDOR_SLUG,
    status: toUiStatus(r.status),
    actor: r.actor ?? null,
    dryRun: Boolean(r.dryRun),
    sourcePath: r.sourcePath ?? null,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    counts: {
      total: r.totalItems ?? null,
      created: r.createdCount ?? null,
      updated: r.updatedCount ?? null,
      removed: r.removedCount ?? null,
      unchanged: r.unchangedCount ?? null,
    },
    hash: r.hash ?? null,
    error: r.error ?? null,
    metadata: r.metadata ?? null,
    updatedAt: r.updatedAt.toISOString(),
    durationMs: r.durationMs ?? null,
  };
}

// ---- compatibility exports for tests ----

export const VendorSyncRunSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  status: z.enum(['running','success','error']),
  actor: z.string().nullable(),
  dryRun: z.boolean(),
  sourcePath: z.string().nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  counts: z.object({
    total: z.number().nullable(),
    created: z.number().nullable(),
    updated: z.number().nullable(),
    removed: z.number().nullable(),
    unchanged: z.number().nullable(),
  }),
  hash: z.string().nullable(),
  error: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  durationMs: z.number().nullable(),
  updatedAt: z.string(),
});
const VendorSyncRunListDataSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  items: z.array(VendorSyncRunSchema),
});

export const VendorSyncRunListResponseSchema = z.object({
  ok: z.literal(true),
  data: VendorSyncRunListDataSchema,
});

export type VendorSyncRunListResponse = z.infer<typeof VendorSyncRunListResponseSchema>;

export const VendorSyncRunDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: VendorSyncRunSchema.nullable(),
});

export type VendorSyncRunDetailResponse = z.infer<typeof VendorSyncRunDetailResponseSchema>;

export function formatVendorSyncRun(run: any) { return normalizeRun(run); }

type ListResponseOptions = {
  page?: number;
  pageSize?: number;
  totalItems?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export function makeVendorSyncRunListResponse(
  runs: NormalizedRun[],
  options: ListResponseOptions = {},
): VendorSyncRunListResponse {
  const rawPage = options.page ?? 1;
  const page = Math.trunc(rawPage >= 1 ? rawPage : 1);
  const rawPageSize = options.pageSize ?? runs.length;
  const pageSize = Math.trunc(rawPageSize > 0 ? rawPageSize : 1);
  const totalItems = Math.max(0, Math.trunc(options.totalItems ?? runs.length));
  const hasMore = options.hasMore ?? totalItems > page * pageSize;
  const nextCursor = options.nextCursor ?? null;

  return {
    ok: true as const,
    data: {
      page,
      pageSize,
      totalItems,
      hasMore,
      nextCursor,
      items: runs,
    },
  };
}

export function makeRunListResponse(
  items: unknown[] = [],
  options: ListResponseOptions = {},
): VendorSyncRunListResponse {
  const runs = items.map((item) => formatVendorSyncRun(item));
  return makeVendorSyncRunListResponse(runs, options);
}

export function makeRunDetailResponse(item: unknown | null): VendorSyncRunDetailResponse {
  return {
    ok: true as const,
    data: item ? formatVendorSyncRun(item) : null,
  };
}
