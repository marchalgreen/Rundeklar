import { deriveBrand } from '@/lib/inventoryFacets';
import type { InventoryItem } from '@/store/inventory';
import type { InventoryMovementEntry } from '@/store/inventoryMovements';

export interface StockHealthBreakdown {
  inStock: number;
  low: number;
  critical: number;
  total: number;
}

export function computeStockHealth(
  items: InventoryItem[],
  options?: { lowThreshold?: number },
): StockHealthBreakdown {
  const lowThreshold = Math.max(0, options?.lowThreshold ?? 5);

  let inStock = 0;
  let low = 0;
  let critical = 0;

  for (const item of items) {
    const qty = typeof item.qty === 'number' ? item.qty : 0;
    if (qty <= 0) {
      critical += 1;
    } else if (qty <= lowThreshold) {
      low += 1;
    } else {
      inStock += 1;
    }
  }

  const total = items.length;

  return { inStock, low, critical, total };
}

export interface InventoryKPIBucket {
  count: number;
  items: InventoryItem[];
}

export interface TopBrandEntry {
  brand: string;
  count: number;
  share: number;
}

export interface InventoryKPIs {
  critical: InventoryKPIBucket;
  low: InventoryKPIBucket;
  aging: InventoryKPIBucket;
  topBrand: TopBrandEntry | null;
  topBrands: TopBrandEntry[];
}

export function computeKPIs(
  items: InventoryItem[],
  options?: { lowThreshold?: number; agingDays?: number },
): InventoryKPIs {
  const lowThreshold = Math.max(0, options?.lowThreshold ?? 5);
  const agingDays = Math.max(1, options?.agingDays ?? 45);

  const criticalItems: InventoryItem[] = [];
  const lowItems: InventoryItem[] = [];
  const agingItems: InventoryItem[] = [];
  const brandCounts = new Map<string, number>();

  const now = new Date();
  const agingCutoff = new Date(now);
  agingCutoff.setDate(now.getDate() - agingDays);

  for (const item of items) {
    const qty = typeof item.qty === 'number' ? item.qty : 0;
    if (qty <= 0) {
      criticalItems.push(item);
    } else if (qty <= lowThreshold) {
      lowItems.push(item);
    }

    const updatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
    if (updatedAt && !Number.isNaN(updatedAt.valueOf()) && updatedAt < agingCutoff) {
      agingItems.push(item);
    }

    const brand = deriveBrand(item);
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
  }

  const total = items.length || 1; // avoid divide-by-zero
  const topBrands = Array.from(brandCounts.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0], 'da');
      return b[1] - a[1];
    })
    .slice(0, 5)
    .map(([brand, count]) => ({
      brand,
      count,
      share: count / total,
    }));

  return {
    critical: { count: criticalItems.length, items: criticalItems },
    low: { count: lowItems.length, items: lowItems },
    aging: { count: agingItems.length, items: agingItems },
    topBrand: topBrands[0] ?? null,
    topBrands,
  };
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  net: number;
  inbound: number;
  outbound: number;
}

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function compute30DayTrend(
  entries: InventoryMovementEntry[],
  options?: { days?: number },
): TrendPoint[] {
  const days = Math.max(1, Math.round(options?.days ?? 30));
  if (days > 90) {
    // prevent runaway loops; dashboard only needs recent history
    throw new RangeError('compute30DayTrend days must be <= 90');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));

  const byDay = new Map<string, { inbound: number; outbound: number; net: number }>();

  for (const entry of entries) {
    const at = entry.atISO ? new Date(entry.atISO) : null;
    if (!at || Number.isNaN(at.valueOf())) continue;
    const normalized = new Date(at);
    normalized.setHours(0, 0, 0, 0);
    if (normalized < start || normalized > today) continue;

    const key = toISODateString(normalized);
    if (!byDay.has(key)) {
      byDay.set(key, { inbound: 0, outbound: 0, net: 0 });
    }
    const bucket = byDay.get(key)!;
    if (entry.delta >= 0) {
      bucket.inbound += entry.delta;
    } else {
      bucket.outbound += Math.abs(entry.delta);
    }
    bucket.net += entry.delta;
  }

  const result: TrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = toISODateString(current);
    const bucket = byDay.get(key);
    result.push({
      date: key,
      net: bucket?.net ?? 0,
      inbound: bucket?.inbound ?? 0,
      outbound: bucket?.outbound ?? 0,
    });
  }

  return result;
}
