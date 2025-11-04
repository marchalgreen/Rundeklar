import type { Event } from '@/store/calendar';

const MINUTES_PER_HOUR = 60;

const toDate = (value: string | Date): Date => new Date(value);

export const minutesPerHour = MINUTES_PER_HOUR;

export function totalMinutes(dayStartHour: number, dayEndHour: number): number {
  return (dayEndHour - dayStartHour) * MINUTES_PER_HOUR;
}

export function minutesToPixels(minutes: number, pxPerMinute: number): number {
  return minutes * pxPerMinute;
}

export function pixelsToMinutes(pixels: number, pxPerMinute: number): number {
  return pixels / pxPerMinute;
}

export function clampMinutes(minutes: number, totalMinutesInDay: number): number {
  if (minutes < 0) return 0;
  if (minutes > totalMinutesInDay) return totalMinutesInDay;
  return minutes;
}

export function snapMinutes(minutes: number, interval: number): number {
  if (interval <= 0) return minutes;
  return Math.round(minutes / interval) * interval;
}

export function isoAtDayMinutes(
  base: string | Date,
  dayStartHour: number,
  minutesFromStart: number,
  totalMinutesInDay?: number
): string {
  const clampTarget =
    typeof totalMinutesInDay === 'number'
      ? clampMinutes(minutesFromStart, totalMinutesInDay)
      : minutesFromStart;
  const date = toDate(base);
  date.setHours(dayStartHour, 0, 0, 0);
  date.setMinutes(clampTarget);
  return date.toISOString();
}

export function isoToDayMinutes(iso: string, dayStartHour: number): number {
  const date = new Date(iso);
  return (date.getHours() - dayStartHour) * MINUTES_PER_HOUR + date.getMinutes();
}

export function durationMinutes(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diff = (end.getTime() - start.getTime()) / 60000;
  return Math.max(1, diff);
}

export function isSameLocalDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function sameLocalDay(isoA: string, isoB: string): boolean {
  return isSameLocalDay(isoA, isoB);
}

export function localDayKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function compareByStart(a: Event, b: Event): number {
  const aTime = new Date(a.start).getTime();
  const bTime = new Date(b.start).getTime();
  if (aTime === bTime) {
    return new Date(a.end).getTime() - new Date(b.end).getTime();
  }
  return aTime - bTime;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeekMonday(date: Date): Date {
  const copy = startOfDay(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
