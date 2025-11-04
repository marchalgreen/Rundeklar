export type VendorSyncRunFixture = {
  id: string;
  vendor: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  dryRun: boolean;
  actor: string;
  sourcePath: string;
  hash: string;
  metrics: {
    total: number;
    created: number;
    updated: number;
    removed: number;
    unchanged: number;
  };
  error?: string | null;
};

const MOSCOT_VENDOR_SLUG = 'moscot';

export type VendorRegistryFixture = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  integration: {
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
  } | null;
};

const baseRuns: VendorSyncRunFixture[] = [
  {
    id: 'run-001',
    vendor: MOSCOT_VENDOR_SLUG,
    status: 'success',
    startedAt: '2024-06-07T08:15:00.000Z',
    finishedAt: '2024-06-07T08:17:00.000Z',
    durationMs: 120_000,
    dryRun: false,
    actor: 'system',
    sourcePath: 's3://vendor-sync/moscot/catalog-2024-06-07.json',
    hash: 'a1b2c3d4e5f6',
    metrics: {
      total: 1200,
      created: 24,
      updated: 12,
      removed: 4,
      unchanged: 1160,
    },
  },
  {
    id: 'run-000',
    vendor: MOSCOT_VENDOR_SLUG,
    status: 'error',
    startedAt: '2024-06-06T07:50:00.000Z',
    finishedAt: '2024-06-06T07:55:00.000Z',
    durationMs: 300_000,
    dryRun: false,
    actor: 'batch-user',
    sourcePath: 's3://vendor-sync/moscot/catalog-2024-06-06.json',
    hash: 'feedbead2222',
    metrics: {
      total: 1190,
      created: 12,
      updated: 22,
      removed: 10,
      unchanged: 1146,
    },
    error: 'Integration timeout',
  },
  {
    id: 'run-2-days-ago',
    vendor: MOSCOT_VENDOR_SLUG,
    status: 'success',
    startedAt: '2024-06-05T06:45:00.000Z',
    finishedAt: '2024-06-05T06:46:30.000Z',
    durationMs: 90_000,
    dryRun: true,
    actor: 'qa-user',
    sourcePath: 's3://vendor-sync/moscot/catalog-2024-06-05.json',
    hash: '1234567890ab',
    metrics: {
      total: 1180,
      created: 10,
      updated: 18,
      removed: 6,
      unchanged: 1146,
    },
  },
];

export function createVendorSyncRunsResponse(): Record<string, unknown> {
  return {
    runs: baseRuns.map((run) => ({
      ...run,
      finishedAt: run.finishedAt,
      dryRun: run.dryRun,
      metrics: { ...run.metrics },
      error: run.error ?? null,
    })),
  };
}

type VendorSyncStateOverride = Partial<{
  vendor: string;
  totalItems: number;
  lastRunAt: string;
  lastDurationMs: number;
  lastSource: string;
  lastHash: string;
  lastRunBy: string;
  lastError: string | null;
}>;

export function createVendorSyncStateResponse(
  override?: VendorSyncStateOverride,
): Record<string, unknown> {
  const latest = baseRuns[0];
  return {
    snapshot: {
      vendor: override?.vendor ?? latest.vendor,
      totalItems: override?.totalItems ?? latest.metrics.total,
      lastRunAt: override?.lastRunAt ?? latest.finishedAt,
      lastDurationMs: override?.lastDurationMs ?? latest.durationMs,
      lastSource: override?.lastSource ?? latest.sourcePath,
      lastHash: override?.lastHash ?? latest.hash,
      lastRunBy: override?.lastRunBy ?? latest.actor,
      lastError: override?.lastError ?? latest.error ?? null,
    },
  };
}

export function createVendorRegistryResponse(
  vendors?: VendorRegistryFixture[],
): Record<string, unknown> {
  const defaultVendors: VendorRegistryFixture[] = [
    {
      id: 'vendor-moscot',
      slug: MOSCOT_VENDOR_SLUG,
      name: 'MOSCOT',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: baseRuns[0].finishedAt,
      integration: {
        id: 'integration-moscot',
        type: 'SCRAPER',
        scraperPath: baseRuns[0].sourcePath,
        apiBaseUrl: null,
        apiAuthType: null,
        apiKey: null,
        lastTestAt: baseRuns[0].finishedAt,
        lastTestOk: true,
        meta: { totalItems: baseRuns[0].metrics.total },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: baseRuns[0].finishedAt,
      },
    },
  ];

  return {
    ok: true,
    data: vendors ?? defaultVendors,
  };
}

export function createVendorRegistryTestResponse(): Record<string, unknown> {
  return {
    ok: true,
    data: {
      ok: true,
      vendor: MOSCOT_VENDOR_SLUG,
      vendorName: 'MOSCOT',
      checkedAt: baseRuns[0].finishedAt,
      meta: { totalItems: baseRuns[0].metrics.total },
    },
  };
}

type ObservabilityOverride = {
  range?: {
    start?: string | null;
    end?: string | null;
  };
};

export function createVendorSyncObservabilityResponse(
  override?: ObservabilityOverride,
): Record<string, unknown> {
  const totals = {
    success: baseRuns.filter((run) => run.status === 'success').length,
    error: baseRuns.filter((run) => run.status === 'error').length,
    running: baseRuns.filter((run) => run.status === 'running').length,
  };

  const response = {
    ok: true,
    data: {
      vendorId: MOSCOT_VENDOR_SLUG,
      range: {
        start: override?.range?.start ?? '2024-06-01T00:00:00.000Z',
        end: override?.range?.end ?? '2024-06-07T23:59:59.999Z',
      },
      pageSize: 25,
      totalRuns: baseRuns.length,
      counts: totals,
      latestRunAt: baseRuns[0].finishedAt,
      hasMore: false,
      nextCursor: null,
      runs: baseRuns.map((run) => ({
        id: run.id,
        vendor: run.vendor,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs: run.durationMs,
        dryRun: run.dryRun,
        actor: run.actor,
        sourcePath: run.sourcePath,
        hash: run.hash,
        metrics: { ...run.metrics },
        error: run.error ?? null,
      })),
    },
  };

  return response;
}
