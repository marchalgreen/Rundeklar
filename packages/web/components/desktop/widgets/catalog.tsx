'use client';

import React from 'react';
import type { WidgetId, WidgetTone } from '@/store/widgets';
import { TodayScheduleWidgetPreview } from './TodayScheduleWidget';
import { CurrentAppointmentWidgetPreview } from './CurrentAppointmentWidget';
import { OrderQueueWidgetPreview } from './OrderQueueWidget';
import { DeviceStatusWidgetPreview } from './DeviceStatusWidget';
import { PackageTrackingWidgetPreview } from './PackageTrackingWidget';

export type WidgetCatalogItem = {
  id: WidgetId;
  title: string;
  description: string;
  tone?: WidgetTone;
  previewSize: { w: number; h: number };
  Preview: React.ComponentType<{ tone?: WidgetTone }>;
};

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    id: 'todaySchedule',
    title: 'Dagens kalender',
    description: 'Dagens aftaler og typer.',
    tone: 'primary',
    previewSize: { w: 360, h: 320 },
    Preview: (p) => <TodayScheduleWidgetPreview {...p} />,
  },
  {
    id: 'currentAppointment',
    title: 'Aktuel aftale',
    description: 'Detaljer for igangværende aftale.',
    tone: 'primary',
    previewSize: { w: 380, h: 300 },
    Preview: (p) => <CurrentAppointmentWidgetPreview {...p} />,
  },
  {
    id: 'orderQueue',
    title: 'Ordrekø',
    description: 'Åbne ordrer og status.',
    tone: 'secondary',
    previewSize: { w: 380, h: 240 },
    Preview: (p) => <OrderQueueWidgetPreview {...p} />,
  },
  {
    id: 'deviceStatus',
    title: 'Enhedsstatus',
    description: 'Forbindelser og enheder.',
    tone: 'secondary',
    previewSize: { w: 380, h: 220 },
    Preview: (p) => <DeviceStatusWidgetPreview {...p} />,
  },
  {
    id: 'packageTracking',
    title: 'Pakkesporing',
    description: 'Indgående og afsendte pakker.',
    tone: 'secondary',
    previewSize: { w: 380, h: 260 },
    Preview: (p) => <PackageTrackingWidgetPreview {...p} />,
  },
];
