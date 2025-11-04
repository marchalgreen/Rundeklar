#!/usr/bin/env tsx
import process from 'node:process';

import { scaffoldNormalizationAdapter } from './sdk';

function printUsage() {
  console.log('Usage: pnpm tsx scripts/vendors/new-adapter.ts <slug> [--name "Vendor Name"] [--force] [--dry-run]');
}

type ParsedArgs = {
  slug: string | null;
  name?: string;
  force: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { slug: null, force: false, dryRun: false };
  }

  const [maybeSlug, ...rest] = args;
  let slug = maybeSlug ?? null;
  let name: string | undefined;
  let force = false;
  let dryRun = false;

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--force') {
      force = true;
      continue;
    }
    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (token.startsWith('--name=')) {
      name = token.slice('--name='.length);
      continue;
    }
    if (token === '--name') {
      const next = rest[i + 1];
      if (!next) {
        throw new Error('--name flag requires a value');
      }
      name = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown flag: ${token}`);
  }

  return { slug, name, force, dryRun };
}

function formatStatus(status: string): string {
  switch (status) {
    case 'written':
      return '✔';
    case 'planned':
      return '•';
    case 'skipped':
      return '⏭';
    default:
      return '?';
  }
}

async function main() {
  try {
    const parsed = parseArgs(process.argv);
    if (!parsed.slug) {
      printUsage();
      process.exit(1);
      return;
    }

    const result = await scaffoldNormalizationAdapter({
      slug: parsed.slug,
      vendorName: parsed.name,
      force: parsed.force,
      dryRun: parsed.dryRun,
    });

    console.log(`Vendor slug: ${result.slug}`);
    console.log(`Vendor name: ${result.vendorName}`);
    console.log('');

    for (const file of result.files) {
      const statusIcon = formatStatus(file.status);
      const actionLabel = file.type.toUpperCase();
      if (file.status === 'skipped') {
        console.log(`${statusIcon} ${actionLabel.padEnd(6)} ${file.relativePath} (skipped: ${file.reason ?? 'already up to date'})`);
      } else {
        console.log(`${statusIcon} ${actionLabel.padEnd(6)} ${file.relativePath}`);
      }
    }

    console.log('');
    if (parsed.dryRun) {
      console.log('Dry run complete. No files were written.');
    } else {
      console.log('Adapter scaffold complete. Implement the normalization logic and add fixtures/tests.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    printUsage();
    process.exit(1);
  }
}

void main();
