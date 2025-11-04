// src/lib/catalog/vendorSyncFormatting.ts

/**
 * Format a vendor sync timestamp using Danish locale conventions.
 * Falls back to em dash when value is null/undefined.
 */
export function formatVendorSyncDate(
  value: Date | string | number | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (value == null) return '—';
  let date: Date | null = null;
  if (value instanceof Date) {
    date = Number.isNaN(value.valueOf()) ? null : value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    date = Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  if (!date) return '—';
  const formatter = new Intl.DateTimeFormat('da-DK', opts ?? { dateStyle: 'medium', timeStyle: 'short' });
  return formatter.format(date);
}

/**
 * Formats a millisecond duration to a short human friendly label.
 * Examples: "532 ms", "42s", "5m 12s", "1t 4m 3s".
 */
export function formatVendorSyncDuration(durationMs: number | null | undefined): string {
  if (durationMs == null) return '—';
  if (!Number.isFinite(durationMs)) return '—';
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours > 0) {
    const remSeconds = seconds % 60;
    return `${hours}t ${remMinutes}m${remSeconds ? ` ${remSeconds}s` : ''}`;
  }

  return `${minutes}m ${seconds}s`;
}

