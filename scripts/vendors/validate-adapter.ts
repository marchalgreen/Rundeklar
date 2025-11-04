#!/usr/bin/env tsx
import process from 'node:process';

import { validateNormalizationAdapter } from './sdk';

type ParsedArgs = {
  slug: string | null;
  json: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { slug: null, json: false };
  }

  const [maybeSlug, ...rest] = args;
  let slug = maybeSlug ?? null;
  let json = false;

  for (const token of rest) {
    if (token === '--json') {
      json = true;
      continue;
    }
    throw new Error(`Unknown flag: ${token}`);
  }

  return { slug, json };
}

function formatCheck(ok: boolean): string {
  return ok ? '✅' : '❌';
}

async function main() {
  try {
    const parsed = parseArgs(process.argv);
    if (!parsed.slug) {
      console.log('Usage: pnpm tsx scripts/vendors/validate-adapter.ts <slug> [--json]');
      process.exit(1);
      return;
    }

    const result = await validateNormalizationAdapter({ slug: parsed.slug });

    if (parsed.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Validation for vendor slug "${result.slug}":`);
      for (const check of result.checks) {
        const icon = formatCheck(check.ok);
        if (check.detail) {
          console.log(`${icon} ${check.name} (${check.detail})`);
        } else {
          console.log(`${icon} ${check.name}`);
        }
      }
      console.log('');
      console.log(result.ok ? 'All checks passed.' : 'Validation failed. See checks above.');
    }

    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    console.log('Usage: pnpm tsx scripts/vendors/validate-adapter.ts <slug> [--json]');
    process.exit(1);
  }
}

void main();
