import type { Event } from '@/store/calendar';
import { durationMinutes, isoToDayMinutes, minutesToPixels } from './time';
import { CALENDAR_MAX_VISIBLE_OVERLAPS } from './config';

export type PositionedEvent = {
  ev: Event;
  top: number;
  height: number;
  col: number;
  cols: number;
  gid: number;
};

export type OverlapGroup = {
  id: number;
  top: number;
  bottom: number;
  maxCols: number;
  hiddenCount: number;
};

export interface OverlapLayoutOptions {
  dayStart: number;
  pxPerMinute: number;
  maxVisible?: number;
}

export function computeOverlapLayout(
  events: Event[],
  { dayStart, pxPerMinute, maxVisible = CALENDAR_MAX_VISIBLE_OVERLAPS }: OverlapLayoutOptions
): { positioned: PositionedEvent[]; groups: OverlapGroup[] } {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const positioned: PositionedEvent[] = [];
  const groupMap = new Map<number, OverlapGroup>();
  let active: PositionedEvent[] = [];
  let gid = 0;

  for (const ev of sorted) {
    const startTs = new Date(ev.start).getTime();

    active = active.filter((item) => new Date(item.ev.end).getTime() > startTs);

    if (active.length === 0) gid += 1;

    const topMinutes = isoToDayMinutes(ev.start, dayStart);
    const duration = durationMinutes(ev.start, ev.end);

    const current: PositionedEvent = {
      ev,
      top: minutesToPixels(topMinutes, pxPerMinute),
      height: minutesToPixels(duration, pxPerMinute),
      col: 0,
      cols: 1,
      gid,
    };

    const usedColumns = new Set(active.map((item) => item.col));
    let column = 0;
    while (usedColumns.has(column)) column += 1;
    current.col = column;

    active.push(current);
    const width = active.length;
    active.forEach((item) => {
      item.cols = width;
    });

    positioned.push(current);

    const existing = groupMap.get(gid);
    const currentBottom = current.top + current.height;
    const group: OverlapGroup = existing ?? {
      id: gid,
      top: current.top,
      bottom: currentBottom,
      maxCols: width,
      hiddenCount: 0,
    };

    group.top = Math.min(group.top, current.top);
    group.bottom = Math.max(group.bottom, currentBottom);
    group.maxCols = Math.max(group.maxCols, width);
    if (current.col >= maxVisible) {
      group.hiddenCount += 1;
    }

    groupMap.set(gid, group);
  }

  return { positioned, groups: Array.from(groupMap.values()) };
}
