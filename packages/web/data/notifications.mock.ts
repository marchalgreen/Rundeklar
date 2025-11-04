import type { NotificationItem, NotificationKind } from '@/components/notifications/Notifications';

export type { NotificationItem, NotificationKind }; // convenient re-export

export const NOTIFICATIONS_MOCK: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'order',
    title: 'Afhentning klar: Ordre #18432',
    body: 'Stel “Raydrift R-201” og Zeiss SmartLife 1.6 er klar til afhentning.',
    when: '2m',
  },
  {
    id: 'n2',
    kind: 'message',
    title: 'Nyt svar fra kunde (Mette L.)',
    body: '“Tak for i dag – kan vi rykke afhentning til fredag?”',
    when: '14m',
  },
  {
    id: 'n3',
    kind: 'calendar',
    title: 'Kalender: Ny online-booking',
    body: 'Tor 14:30 · Synsprøve · Jonas K.',
    when: '1h',
  },
  {
    id: 'n4',
    kind: 'report',
    title: 'Dagsrapport er klar',
    body: 'PDF med dagens omsætning og bestillinger.',
    when: 'Today',
    read: true,
  },
  {
    id: 'n5',
    kind: 'feature',
    title: 'Ny funktion: “Indblik”',
    body: 'Dashboards med salg, lager og konverteringer.',
    when: 'Yesterday',
    read: true,
  },
  {
    id: 'n6',
    kind: 'system',
    title: 'Integration fejlede (e-conomic)',
    body: 'API-token udløbet. Forny under Indstillinger → Integrationer.',
    when: 'Yesterday',
  },
];
