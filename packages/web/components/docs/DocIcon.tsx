import type { ComponentType } from 'react';

import { Bell, Building2, CalendarCheck2, CalendarDays, CalendarRange, Clock, Code2, FileCode2, FileText, Info, LayoutDashboard, Package, Rocket, ServerCog, UploadCloud, Webhook } from 'lucide-react';
import clsx from 'clsx';

const ICONS = {
  overview: CalendarDays,
  quickstart: Rocket,
  ui: LayoutDashboard,
  sdk: Code2,
  package: Package,
  api: ServerCog,
  availability: Clock,
  events: CalendarRange,
  eventDetail: CalendarCheck2,
  reminders: Bell,
  providers: Building2,
  ics: UploadCloud,
  webhooks: Webhook,
  swagger: FileCode2,
  info: Info,
} satisfies Record<string, ComponentType<{ className?: string }>>;

export type DocIconName = keyof typeof ICONS | 'default';

export interface DocIconProps {
  name?: DocIconName;
  className?: string;
}

export function DocIcon({ name = 'default', className }: DocIconProps) {
  const Icon = name === 'default' ? FileText : ICONS[name] ?? FileText;
  return <Icon className={clsx('h-5 w-5 text-slate-400 dark:text-slate-500', className)} aria-hidden="true" />;
}

export default DocIcon;
