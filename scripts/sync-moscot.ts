#!/usr/bin/env node
import * as path from 'node:path';
import { dispatchVendorSync } from '../packages/web/src/lib/catalog/vendorSyncDispatcher';
import { DEFAULT_VENDOR_NAME, DEFAULT_VENDOR_SLUG } from '../packages/web/src/lib/catalog/vendorSlugs';
import type { SyncCatalogSummary } from '../packages/web/src/lib/catalog/moscotSync';
import { getPrisma } from '../packages/web/src/lib/db';

function parseArgs(argv: string[]) {
  let sourcePath: string | undefined;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '--dryRun') { dryRun = true; continue; }
    if (arg.startsWith('--source=')) { sourcePath = arg.slice('--source='.length); continue; }
    if (arg === '--source' || arg === '-s') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) { sourcePath = next; i += 1; }
    }
  }
  return { sourcePath, dryRun };
}

async function main() {
  const { sourcePath, dryRun } = parseArgs(process.argv.slice(2));
  const result: SyncCatalogSummary = await dispatchVendorSync(DEFAULT_VENDOR_SLUG, {
    sourcePath,
    dryRun,
    actor: 'cli',
  });

  const relSource = typeof result.sourcePath === 'string' && result.sourcePath.startsWith(process.cwd())
    ? path.relative(process.cwd(), result.sourcePath)
    : result.sourcePath ?? 'n/a';

  console.log(
    `➡️  ${DEFAULT_VENDOR_NAME} sync run=${result.runId ?? 'n/a'} status=${result.status ?? 'Success'} ` +
    `(${result.dryRun ? 'dry-run' : 'apply'}) — total=${result.total} ` +
    `created=${result.created} updated=${result.updated} ` +
    `removed=${result.removed} unchanged=${result.unchanged} ` +
    `source=${relSource} duration=${result.durationMs}ms`
  );

  if (result.dryRun) console.log('    (dry-run mode — database was not modified)');
  await (await getPrisma()).$disconnect();
}

main().catch((err) => {
  console.error(`❌ ${DEFAULT_VENDOR_NAME} sync failed:`, err instanceof Error ? err.message : err);
  process.exit(1);
});
