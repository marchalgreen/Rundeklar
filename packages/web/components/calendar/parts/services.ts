'use client';

import type { ServiceType } from '@/store/calendar';
import {
  Eye,
  Eyeglasses,
  Wrench,
  Package,
  CheckCircle,
  CircleHalfTilt,
  Calendar as CalendarIcon,
} from '@phosphor-icons/react';

/**
 * IMPORTANT about colors:
 * Your CSS already defines tokens like --svc-eyeexam, etc.
 * We keep the same convention: we store the HSL token without 'hsl()' wrapper
 * so you can apply it as: style={{ color: `hsl(${meta.hue})` }}
 */
export type ServiceMeta = {
  key: ServiceType;
  label: string;
  hue: string; // HSL tokens without wrapper, e.g. "210 90% 55%"
  Icon: typeof Eye;
};

export const SERVICE_META: Record<ServiceType, ServiceMeta> = {
  eyeexam: { key: 'eyeexam', label: 'Synsprøve', hue: '210 88% 55%', Icon: Eye },
  lenses: { key: 'lenses', label: 'Linser', hue: '275 68% 56%', Icon: CircleHalfTilt },
  check: { key: 'check', label: 'Kontrol', hue: '150 58% 42%', Icon: CheckCircle },
  glasses: { key: 'glasses', label: 'Briller', hue: '46 100% 46%', Icon: Eyeglasses },
  repair: { key: 'repair', label: 'Reparation', hue: '8 74% 52%', Icon: Wrench },
  pickup: { key: 'pickup', label: 'Afhentning', hue: '28 92% 54%', Icon: Package },
  other: { key: 'other', label: 'Andet', hue: '220 8% 55%', Icon: CalendarIcon },
};

/** Back-compat helper for places already using svcHue(svc) */
export function svcHue(svc: ServiceType): string {
  return SERVICE_META[svc]?.hue ?? SERVICE_META.other.hue;
}
