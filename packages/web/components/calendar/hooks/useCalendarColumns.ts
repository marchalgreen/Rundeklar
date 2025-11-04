'use client';

import { useMemo } from 'react';
import { addDays, startOfDay, startOfWeekMonday } from '@/lib/calendar/time';
import {
  Staff,
  StaffId,
  selectStaffSorted,
  useCalendar,
} from '@/store/calendar';

export function useDayColumns(staffMap: Record<StaffId, Staff>): Staff[] {
  const sorted = useCalendar(selectStaffSorted);
  return useMemo(() => {
    if (useCalendar.getState().staff === staffMap) {
      return sorted;
    }
    return Object.values(staffMap).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [sorted, staffMap]);
}

export function useWeekDays(baseISO: string, weekStartsToday: boolean): Date[] {
  return useMemo(() => {
    const base = new Date(baseISO);
    const start = weekStartsToday ? startOfDay(base) : startOfWeekMonday(base);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [baseISO, weekStartsToday]);
}
