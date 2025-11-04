export const DEFAULT_VENDOR_SLUG = 'moscot';
export const DEFAULT_VENDOR_NAME = 'MOSCOT';

const KNOWN_VENDOR_LABELS: Record<string, string> = {
  [DEFAULT_VENDOR_SLUG]: DEFAULT_VENDOR_NAME,
    'acme': 'Acme',
  // @vendor-sdk:vendors
};

export function normalizeVendorSlug(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase();
}

export function resolveVendorSlug(value: unknown, fallback: string = DEFAULT_VENDOR_SLUG) {
  const slug = normalizeVendorSlug(value);
  return slug || fallback;
}

export function vendorLabel(slug: string): string {
  return KNOWN_VENDOR_LABELS[slug] ?? slug;
}
