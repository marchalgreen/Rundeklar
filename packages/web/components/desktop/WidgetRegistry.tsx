'use client';

import React, { useEffect } from 'react';
import { useWidgets } from '@/store/widgets';
import TodayScheduleWidget from './widgets/TodayScheduleWidget';
import CurrentAppointmentWidget from './widgets/CurrentAppointmentWidget';
import DeviceStatusWidget from './widgets/DeviceStatusWidget';
import OrderQueueWidget from './widgets/OrderQueueWidget';
import PackageTrackingWidget from './widgets/PackageTrackingWidget';
import GridOverlay from './widgets/GridOverlay';

export default function WidgetRegistry() {
  const { enabled, toggleAll } = useWidgets();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
        e.preventDefault();
        toggleAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleAll]);

  if (!enabled) return null;

  return (
    <>
      <GridOverlay />
      <TodayScheduleWidget />
      <CurrentAppointmentWidget />
      <OrderQueueWidget />
      <DeviceStatusWidget />
      <PackageTrackingWidget />
    </>
  );
}
