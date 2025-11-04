// src/components/desktop/windowRegistry.tsx
'use client';

import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { useDesktop } from '@/store/desktop';
import type { WinState } from '@/store/desktop';
import { useShallow } from 'zustand/react/shallow';
import Window from '@/components/desktop/Window';
import {
  BookOpen,
  CalendarDays,
  Keyboard,
  NotebookPen,
  Package as PackageIcon,
  PackagePlus,
  Search,
  UserCircle2,
  Info, // <-- NEW icon for item detail window
  LayoutDashboard,
} from 'lucide-react';

// Window bodies
import KundekortSearch from '@/components/windows/KundekortSearch';
import CustomerForm from '@/components/windows/CustomerForm';
import LogbookWindow from '@/components/windows/LogbookWindow';
import InventoryWindow from '@/components/windows/InventoryWindow';
import InventoryDashboardWindow from '@/components/windows/InventoryDashboardWindow';
import HotkeysHelp from '@/components/windows/HotkeysHelp';
import SynsJournal from '@/components/windows/SynsJournal';
import ItemDetailWindow from '@/components/windows/ItemDetailWindow'; // <-- NEW
import PRWindow from '@/components/windows/PRWindow';

// Calendar (singleton)
import BookingCalendar from '@/windows/BookingCalendar';

export interface WindowDef {
  id: string;
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  mount: (win: WinState) => ReactElement;
}

type CustomerFormPayload = ComponentProps<typeof CustomerForm>['payload'];
type SynsJournalPayload = ComponentProps<typeof SynsJournal>['payload'];
type HotkeysPayload = ComponentProps<typeof HotkeysHelp>['payload'];
type ItemDetailPayload = ComponentProps<typeof ItemDetailWindow>['payload'];

const mountKundekortSearch: WindowDef['mount'] = () => <KundekortSearch />;
const mountCustomerForm: WindowDef['mount'] = ({ payload }) => (
  <CustomerForm payload={payload as CustomerFormPayload} />
);
const mountLogbook: WindowDef['mount'] = () => <LogbookWindow />;
const mountInventory: WindowDef['mount'] = () => <InventoryWindow />;
const mountInventoryDashboard: WindowDef['mount'] = () => <InventoryDashboardWindow />;
const mountHotkeys: WindowDef['mount'] = ({ payload }) => (
  <HotkeysHelp payload={payload as HotkeysPayload} />
);
const mountSynsJournal: WindowDef['mount'] = ({ payload }) => (
  <SynsJournal payload={payload as SynsJournalPayload} />
);
const mountBookingCalendar: WindowDef['mount'] = () => <BookingCalendar />;
const mountItemDetail: WindowDef['mount'] = ({ payload }) => (
  <ItemDetailWindow payload={payload as ItemDetailPayload} />
);
const mountPurchaseRequest: WindowDef['mount'] = ({ payload }) => (
  <PRWindow payload={payload as { id?: string }} />
);

// Map store `type` → window definition
const registry: Record<string, WindowDef> = {
  kundekortSearch: {
    id: 'kundekortSearch',
    title: 'Kundekort',
    icon: Search,
    mount: mountKundekortSearch,
  },
  kundekort_search: {
    id: 'kundekort_search',
    title: 'Kundekort',
    icon: Search,
    mount: mountKundekortSearch,
  },
  customerForm: {
    id: 'customerForm',
    title: 'Kundekort',
    icon: UserCircle2,
    mount: mountCustomerForm,
  },
  customer: {
    id: 'customer',
    title: 'Kundekort',
    icon: UserCircle2,
    mount: mountCustomerForm,
  },
  logbook: {
    id: 'logbook',
    title: 'Logbog',
    icon: BookOpen,
    mount: mountLogbook,
  },
  inventory: {
    id: 'inventory',
    title: 'Varer',
    icon: PackageIcon,
    mount: mountInventory,
  },
  inventoryDashboard: {
    id: 'inventoryDashboard',
    title: 'Inventory Dashboard',
    icon: LayoutDashboard,
    mount: mountInventoryDashboard,
  },
  itemDetail: {
    id: 'itemDetail',
    title: 'Vare',
    icon: Info,
    mount: mountItemDetail,
  },
  purchaseRequest: {
    id: 'purchaseRequest',
    title: 'Purchase Requests',
    icon: PackagePlus,
    mount: mountPurchaseRequest,
  },
  hotkeys: {
    id: 'hotkeys',
    title: 'Genveje',
    icon: Keyboard,
    mount: mountHotkeys,
  },
  hotkeys_help: {
    id: 'hotkeys_help',
    title: 'Genveje',
    icon: Keyboard,
    mount: mountHotkeys,
  },
  synsJournal: {
    id: 'synsJournal',
    title: 'Syns-/journal',
    icon: NotebookPen,
    mount: mountSynsJournal,
  },
  booking_calendar: {
    id: 'booking_calendar',
    title: 'Kalender',
    icon: CalendarDays,
    mount: mountBookingCalendar,
  },
};

export default function WindowRegistry() {
  const { order, windows } = useDesktop(
    useShallow((s) => ({ order: s.order, windows: s.windows })),
  );

  return (
    <>
      {order.map((id) => {
        const win = windows[id];
        if (!win) return null;

        const def = registry[win.type];
        if (!def) return null; // unmapped type → not rendered (still in taskbar)

        return (
          <Window key={id} win={win}>
            {def.mount(win)}
          </Window>
        );
      })}
    </>
  );
}
