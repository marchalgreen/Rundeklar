import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { normalizeVendorSlug } from '../packages/web/src/lib/catalog/vendorSlugs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..', 'packages', 'web');

const IMPORT_MARKER = '// @vendor-sdk:imports';
const ADAPTER_MARKER = '// @vendor-sdk:adapters';
const VENDOR_MARKER = '// @vendor-sdk:vendors';

export type FileStatus = 'planned' | 'written' | 'skipped';
export type FileAction = 'create' | 'update';

export type ScaffoldFile = {
  path: string;
  relativePath: string;
  type: FileAction;
  status: FileStatus;
  contents?: string;
  reason?: string;
};

export type ScaffoldOptions = {
  slug: string;
  vendorName?: string;
  rootDir?: string;
  force?: boolean;
  dryRun?: boolean;
};

export type ScaffoldResult = {
  slug: string;
  vendorName: string;
  dryRun: boolean;
  adapterSymbol: string;
  normalizeFunction: string;
  files: ScaffoldFile[];
};

export type ValidationCheck = {
  name: string;
  ok: boolean;
  detail?: string;
};

export type ValidationResult = {
  slug: string;
  checks: ValidationCheck[];
  ok: boolean;
};

function splitSlug(slug: string): string[] {
  return slug
    .split(/[^a-zA-Z0-9]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function pascalCase(slug: string): string {
  const words = splitSlug(slug);
  if (words.length === 0) return '';
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function camelCase(slug: string): string {
  const words = splitSlug(slug);
  if (words.length === 0) return slug.toLowerCase();
  const [first, ...rest] = words;
  const firstLower = first.toLowerCase();
  const tail = rest.map((word) => {
    const lower = word.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return [firstLower, ...tail].join('');
}

function titleCase(slug: string): string {
  const words = splitSlug(slug);
  if (words.length === 0) {
    return slug.toUpperCase();
  }
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function pathExists(input: string): Promise<boolean> {
  try {
    await fs.stat(input);
    return true;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
    }
    throw err;
  }
}

function replaceAll(source: string, token: string, value: string): string {
  return source.split(token).join(value);
}

async function loadTemplate(rootDir: string): Promise<string> {
  const templatePath = path.join(
    rootDir,
    'src/lib/catalog/normalization/adapters/template/adapter.template.ts',
  );
  return fs.readFile(templatePath, 'utf8');
}

function buildRelative(rootDir: string, target: string): string {
  const relative = path.relative(rootDir, target);
  return relative || target;
}

export async function scaffoldNormalizationAdapter(
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const rootDir = options.rootDir ?? DEFAULT_ROOT;
  const dryRun = options.dryRun ?? false;

  const slug = normalizeVendorSlug(options.slug);
  if (!slug) {
    throw new Error('Vendor slug must be a non-empty string.');
  }

  const vendorName = options.vendorName?.trim() || titleCase(slug);
  if (!vendorName) {
    throw new Error('Vendor name must resolve to a non-empty value.');
  }

  const pascal = pascalCase(slug);
  const camel = camelCase(slug);
  const rawSchemaName = `${pascal}RawProductSchema`;
  const rawTypeName = `${pascal}RawProduct`;
  const normalizeFunction = `normalize${pascal}Product`;
  const adapterSymbol = `${camel}NormalizationAdapter`;

  const template = await loadTemplate(rootDir);
  const replacements = new Map<string, string>([
    ['__VENDOR_SLUG__', slug],
    ['__VENDOR_NAME__', vendorName],
    ['__RAW_SCHEMA_NAME__', rawSchemaName],
    ['__RAW_TYPE_NAME__', rawTypeName],
    ['__NORMALIZE_FN__', normalizeFunction],
    ['__ADAPTER_CONST__', adapterSymbol],
  ]);

  let adapterSource = template;
  for (const [token, value] of replacements) {
    adapterSource = replaceAll(adapterSource, token, value);
  }

  const adapterPath = path.join(
    rootDir,
    'src/lib/catalog/normalization/adapters',
    `${slug}.ts`,
  );
  const adapterExists = await pathExists(adapterPath);
  if (adapterExists && !options.force) {
    throw new Error(
      `Adapter for slug "${slug}" already exists (${buildRelative(rootDir, adapterPath)}). Use --force to overwrite.`,
    );
  }

  const files: ScaffoldFile[] = [];
  files.push({
    path: adapterPath,
    relativePath: buildRelative(rootDir, adapterPath),
    type: adapterExists ? 'update' : 'create',
    status: 'planned',
    contents: adapterSource,
  });

  const indexPath = path.join(rootDir, 'src/lib/catalog/normalization/adapters/index.ts');
  const indexSource = await fs.readFile(indexPath, 'utf8');
  if (!indexSource.includes(IMPORT_MARKER) || !indexSource.includes(ADAPTER_MARKER)) {
    throw new Error(
      'Normalization adapter index is missing vendor SDK markers. Ensure the file contains the expected comments.',
    );
  }
  const importLine = `import { ${adapterSymbol} } from './${slug}';`;
  const adapterEntry = `  ${adapterSymbol} as AdapterEntry,`;

  let nextIndexSource = indexSource;
  let indexChanged = false;
  if (!indexSource.includes(importLine)) {
    nextIndexSource = nextIndexSource.replace(
      IMPORT_MARKER,
      `${importLine}\n${IMPORT_MARKER}`,
    );
    indexChanged = true;
  }
  if (!indexSource.includes(adapterEntry)) {
    nextIndexSource = nextIndexSource.replace(
      ADAPTER_MARKER,
      `${adapterEntry}\n  ${ADAPTER_MARKER}`,
    );
    indexChanged = true;
  }

  if (indexChanged) {
    files.push({
      path: indexPath,
      relativePath: buildRelative(rootDir, indexPath),
      type: 'update',
      status: 'planned',
      contents: nextIndexSource,
    });
  } else {
    files.push({
      path: indexPath,
      relativePath: buildRelative(rootDir, indexPath),
      type: 'update',
      status: 'skipped',
      reason: 'Adapter already registered in index',
    });
  }

  const vendorSlugsPath = path.join(rootDir, 'src/lib/catalog/vendorSlugs.ts');
  const vendorSlugsSource = await fs.readFile(vendorSlugsPath, 'utf8');
  if (!vendorSlugsSource.includes(VENDOR_MARKER)) {
    throw new Error(
      'vendorSlugs.ts is missing the vendor SDK marker. Ensure the file contains the expected comment.',
    );
  }
  const vendorLine = `  '${slug}': '${escapeSingleQuotes(vendorName)}',`;
  if (vendorSlugsSource.includes(vendorLine)) {
    files.push({
      path: vendorSlugsPath,
      relativePath: buildRelative(rootDir, vendorSlugsPath),
      type: 'update',
      status: 'skipped',
      reason: 'Vendor label already present',
    });
  } else {
    const nextVendorSlugs = vendorSlugsSource.replace(
      VENDOR_MARKER,
      `${vendorLine}\n  ${VENDOR_MARKER}`,
    );
    files.push({
      path: vendorSlugsPath,
      relativePath: buildRelative(rootDir, vendorSlugsPath),
      type: 'update',
      status: 'planned',
      contents: nextVendorSlugs,
    });
  }

  if (!dryRun) {
    for (const file of files) {
      if (file.status === 'skipped') continue;
      if (file.contents === undefined) {
        throw new Error(`Missing contents for planned action at ${file.relativePath}`);
      }
      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(file.path, file.contents, 'utf8');
      file.status = 'written';
    }
  }

  return {
    slug,
    vendorName,
    dryRun,
    adapterSymbol,
    normalizeFunction,
    files,
  };
}

function isZodSchema(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'safeParse' in value &&
    typeof (value as { safeParse: unknown }).safeParse === 'function'
  );
}

function findAdapterExport(moduleExports: Record<string, unknown>, slug: string) {
  for (const value of Object.values(moduleExports)) {
    if (
      value &&
      typeof value === 'object' &&
      'vendor' in value &&
      value.vendor &&
      typeof value.vendor === 'object' &&
      (value.vendor as { slug?: unknown }).slug === slug
    ) {
      return value;
    }
  }
  return undefined;
}

export async function validateNormalizationAdapter(
  options: { slug: string; rootDir?: string },
): Promise<ValidationResult> {
  const rootDir = options.rootDir ?? DEFAULT_ROOT;
  const slug = normalizeVendorSlug(options.slug);
  if (!slug) {
    throw new Error('Vendor slug must be provided for validation.');
  }

  const checks: ValidationCheck[] = [];

  const adapterPath = path.join(
    rootDir,
    'src/lib/catalog/normalization/adapters',
    `${slug}.ts`,
  );
  const adapterRelative = buildRelative(rootDir, adapterPath);
  const adapterExists = await pathExists(adapterPath);
  checks.push({
    name: `adapter file (${adapterRelative})`,
    ok: adapterExists,
    detail: adapterExists ? undefined : 'Adapter file not found',
  });

  let adapterModule: Record<string, unknown> | undefined;
  if (adapterExists) {
    try {
      const moduleUrl = pathToFileURL(adapterPath).href;
      adapterModule = (await import(moduleUrl)) as Record<string, unknown>;
      checks.push({ name: 'module import', ok: true });
    } catch (err) {
      checks.push({
        name: 'module import',
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    checks.push({
      name: 'module import',
      ok: false,
      detail: 'Skipped because adapter file is missing',
    });
  }

  let adapter: unknown;
  if (adapterModule) {
    adapter = findAdapterExport(adapterModule, slug);
    checks.push({
      name: 'export exposes adapter',
      ok: !!adapter,
      detail: adapter ? undefined : `No export with vendor slug "${slug}" found`,
    });
  }

  if (adapter && typeof adapter === 'object') {
    const inputSchema = (adapter as { inputSchema?: unknown }).inputSchema;
    checks.push({
      name: 'inputSchema is a Zod schema',
      ok: isZodSchema(inputSchema),
      detail: isZodSchema(inputSchema)
        ? undefined
        : 'inputSchema is missing or does not expose safeParse()',
    });

    const normalize = (adapter as { normalize?: unknown }).normalize;
    checks.push({
      name: 'normalize function present',
      ok: typeof normalize === 'function',
      detail:
        typeof normalize === 'function'
          ? undefined
          : 'normalize property is not a function',
    });

    const vendorSlug = (adapter as { vendor?: { slug?: string } }).vendor?.slug;
    checks.push({
      name: 'adapter vendor slug matches',
      ok: vendorSlug === slug,
      detail:
        vendorSlug === slug
          ? undefined
          : `Expected vendor slug "${slug}", received "${vendorSlug ?? 'unknown'}"`,
    });
  } else {
    checks.push({
      name: 'inputSchema is a Zod schema',
      ok: false,
      detail: 'Adapter export not resolved',
    });
    checks.push({
      name: 'normalize function present',
      ok: false,
      detail: 'Adapter export not resolved',
    });
    checks.push({
      name: 'adapter vendor slug matches',
      ok: false,
      detail: 'Adapter export not resolved',
    });
  }

  try {
    const registryModuleUrl = pathToFileURL(
      path.join(rootDir, 'src/lib/catalog/normalization/adapters/index.ts'),
    ).href;
    const registryModule = await import(registryModuleUrl);
    if (registryModule && typeof registryModule.getNormalizationAdapter === 'function') {
      const registryAdapter = registryModule.getNormalizationAdapter(slug);
      checks.push({
        name: 'adapter registered in index',
        ok: !!registryAdapter,
        detail: registryAdapter ? undefined : 'Registry lookup returned undefined',
      });
    } else {
      checks.push({
        name: 'adapter registered in index',
        ok: false,
        detail: 'getNormalizationAdapter not exported from adapters/index.ts',
      });
    }
  } catch (err) {
    checks.push({
      name: 'adapter registered in index',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const vendorModuleUrl = pathToFileURL(
      path.join(rootDir, 'src/lib/catalog/vendorSlugs.ts'),
    ).href;
    const vendorModule = await import(vendorModuleUrl);
    if (vendorModule && typeof vendorModule.vendorLabel === 'function') {
      const label = vendorModule.vendorLabel(slug);
      checks.push({
        name: 'vendor label configured',
        ok: typeof label === 'string' && label.length > 0,
        detail: label ? `label: ${label}` : 'vendorLabel returned an empty value',
      });
    } else {
      checks.push({
        name: 'vendor label configured',
        ok: false,
        detail: 'vendorLabel not exported from vendorSlugs.ts',
      });
    }
  } catch (err) {
    checks.push({
      name: 'vendor label configured',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const ok = checks.every((check) => check.ok);
  return { slug, checks, ok };
}
