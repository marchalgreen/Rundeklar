'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import { useCalendar, focusRestoreAnchor } from '@/store/calendar';
import type { CalendarState, CustomerId, Event, StaffId } from '@/store/calendar';
import { openDeleteConfirm } from './DeleteConfirm';
import { SERVICE_META } from './parts/services';
import { openEventEditor } from './eventEditor'; // 👈 NEW

type EventId = Event['id'];
type EmptyTarget = { type: 'empty'; staffId: StaffId; startISO: string; minutes?: number };
type EventTarget = { type: 'event'; eventId: EventId };
type MenuTarget = EmptyTarget | EventTarget;

type CalendarIcon = React.ComponentType<PhosphorIconProps>;

type Ctx = { openAt: (x: number, y: number, target: MenuTarget) => void; close: () => void };

const MenuContext = createContext<Ctx | null>(null);

type CalendarCreateInput = Parameters<CalendarState['create']>[0];
type ExtendedCreateInput = CalendarCreateInput &
  Pick<Event, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;

export function useContextMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useContextMenu must be used within ContextMenuProvider');
  return ctx;
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    x: number;
    y: number;
    target: MenuTarget | null;
  }>({ open: false, x: 0, y: 0, target: null });

  const ignoreFirstClickRef = useRef(false);
  const { cancelRange } = useCalendar();

  const close = React.useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    cancelRange();
    focusRestoreAnchor();
  }, [cancelRange]);

  const openAt = React.useCallback((x: number, y: number, target: MenuTarget) => {
    const active = document.activeElement as HTMLElement | null;
    useCalendar.getState().setFocusAnchor(active);
    ignoreFirstClickRef.current = true;
    setState({ open: true, x, y, target });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    let cleanup = () => {};
    const attach = () => {
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
      const onClick = () => {
        if (ignoreFirstClickRef.current) {
          ignoreFirstClickRef.current = false;
          return;
        }
        close();
      };
      window.addEventListener('keydown', onKey);
      window.addEventListener('click', onClick, true);
      cleanup = () => {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('click', onClick, true);
      };
    };
    const t = setTimeout(attach, 0);
    return () => {
      clearTimeout(t);
      cleanup();
    };
  }, [state.open, close]);

  const value = useMemo(() => ({ openAt, close }), [openAt, close]);

  return (
    <MenuContext.Provider value={value}>
      {children}
      {state.open &&
        state.target &&
        createPortal(
          <MenuSurface x={state.x} y={state.y} target={state.target} onClose={close} />,
          document.body
        )}
    </MenuContext.Provider>
  );
}

type MenuItem = {
  label: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
  dotHsl?: string;
  Icon?: CalendarIcon;
};

function MenuSurface({
  x,
  y,
  target,
  onClose,
}: {
  x: number;
  y: number;
  target: MenuTarget;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { create, update, staff, events, setSelection } = useCalendar();

  const [pos, setPos] = useState({ x, y });
  const [openTopIdx, setOpenTopIdx] = useState<number | null>(null);
  const focusablesRef = useRef<HTMLElement[]>([]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(4, Math.min(x, innerWidth - r.width - 8)),
      y: Math.max(4, Math.min(y, innerHeight - r.height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[data-menu-item]:not([disabled])')
    );
    focusablesRef.current = items;
    const active = document.activeElement as HTMLElement | null;
    if (!root.contains(active)) {
      (items[0] ?? root).focus({ preventScroll: true });
    }
  }, [target, pos.x, pos.y, openTopIdx]);

  const handleMenuKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      const focusables = focusablesRef.current;
      if (!focusables.length) return;
      const active = document.activeElement as HTMLElement | null;
      const currentIndex = focusables.findIndex((el) => el === active);
      const move = (delta: number) => {
        const baseIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (baseIndex + delta + focusables.length) % focusables.length;
        const next = focusables[nextIndex];
        next?.focus({ preventScroll: true });
      };
      if (e.key === 'Tab') {
        e.preventDefault();
        move(e.shiftKey ? -1 : 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      }
    },
    [onClose]
  );

  // --- actions
  const addEvent = async (serviceKey: keyof typeof SERVICE_META, title?: string) => {
    if (target.type !== 'empty') return;
    const meta = SERVICE_META[serviceKey];
    const m = target.minutes ?? 30;
    const start = target.startISO;
    const end = new Date(new Date(start).getTime() + m * 60000).toISOString();
    const payload: ExtendedCreateInput = {
      title: title ?? meta.label,
      customerId: ('c_' + Math.random().toString(36).slice(2, 7)) as CustomerId,
      staffId: target.staffId,
      start,
      end,
      status: 'booked',
      serviceType: meta.key,
      createdBy: 'system',
      updatedBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const created = await create(payload);

    setSelection({ eventId: created.id });
    onClose();

    // 👇 Immediately open editor with Customer search focused
    openEventEditor(created.id, { focus: 'customer' });
  };

  const duplicateEvent = async () => {
    if (target.type !== 'event') return;
    const ev = events[target.eventId];
    if (!ev) return;
    const dur = new Date(ev.end).getTime() - new Date(ev.start).getTime();
    const start = new Date(ev.end).toISOString();
    const end = new Date(new Date(start).getTime() + dur).toISOString();
    const payload: ExtendedCreateInput = {
      title: ev.title || SERVICE_META[ev.serviceType]?.label || 'Ny aftale',
      customerId: ev.customerId,
      staffId: ev.staffId,
      resourceId: ev.resourceId,
      start,
      end,
      status: ev.status,
      serviceType: ev.serviceType,
      notes: ev.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: ev.createdBy ?? 'system',
      updatedBy: ev.updatedBy ?? 'system',
    };
    const created = await create(payload);
    setSelection({ eventId: created.id });
    onClose();
  };

  const assignStaff = async (staffId: string) => {
    if (target.type !== 'event') return;
    await update(target.eventId, { staffId });
    onClose();
  };

  const setStatus = async (
    status: 'booked' | 'checked_in' | 'completed' | 'tentative' | 'no_show' | 'cancelled'
  ) => {
    if (target.type !== 'event') return;
    await update(target.eventId, { status });
    onClose();
  };

  const convertService = async (serviceKey: keyof typeof SERVICE_META) => {
    if (target.type !== 'event') return;
    const meta = SERVICE_META[serviceKey];
    const ev = events[target.eventId];
    if (!ev) return;
    const wasDefaultTitle = !ev.title || ev.title === SERVICE_META[ev.serviceType]?.label;
    await update(target.eventId, {
      serviceType: meta.key,
      title: wasDefaultTitle ? meta.label : ev.title,
    });
    onClose();
  };

  // --- menus
  const staffList = Object.values(staff);
  const staffSubmenu: MenuItem[] = staffList.map((s) => ({
    label: s.name,
    action: () => assignStaff(s.id),
  }));

  const statusSubmenu: MenuItem[] = [
    { label: 'Booket', action: () => setStatus('booked') },
    { label: 'Check ind', action: () => setStatus('checked_in') },
    { label: 'Fuldført', action: () => setStatus('completed') },
    { label: 'Foreløbig', action: () => setStatus('tentative') },
    { label: 'Udeblevet', action: () => setStatus('no_show') },
    { label: 'Annulleret', action: () => setStatus('cancelled') },
  ];

  const allServices = Object.values(SERVICE_META);
  const createSubmenu: MenuItem[] = allServices.map((meta) => ({
    label: `Tilføj ${meta.label.toLowerCase()}`,
    action: () => addEvent(meta.key),
    dotHsl: meta.hue,
    Icon: meta.Icon,
  }));
  const convertSubmenu: MenuItem[] = allServices.map((meta) => ({
    label: meta.label,
    action: () => convertService(meta.key),
    dotHsl: meta.hue,
    Icon: meta.Icon,
  }));

  const emptyMenu: MenuItem[] = [
    { label: 'Tilføj ny aftale', action: () => addEvent('other', 'Ny aftale') },
    { separator: true, label: '' },
    ...createSubmenu,
  ];

  const eventMenu: MenuItem[] = [
    {
      label: 'Rediger',
      action: () => {
        if (target.type === 'event') openEventEditor(target.eventId);
        onClose();
      },
    },
    { label: 'Dupliker', action: duplicateEvent },
    {
      label: 'Slet',
      action: () => {
        if (target.type === 'event') openDeleteConfirm(target.eventId);
        onClose();
      },
    },
    { separator: true, label: '' },
    { label: 'Skift type', submenu: convertSubmenu },
    { label: 'Tildel', submenu: staffSubmenu, disabled: staffSubmenu.length === 0 },
    { label: 'Status', submenu: statusSubmenu },
  ];

  const items = target.type === 'event' ? eventMenu : emptyMenu;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[240px] rounded-xl border border-hair bg-white/95 shadow-xl backdrop-blur"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      tabIndex={-1}
      role="menu"
      aria-label="Kalender kontekstmenu"
      data-menu-surface
      onKeyDown={handleMenuKey}
    >
        <ul className="py-1" role="none">
          {items.map((item, i) => {
            if (item.separator)
              return (
                <li
                  key={`sep-${i}`}
                  className="my-1 h-px bg-[hsl(var(--line))]"
                  role="separator"
                />
              );
          const hasSub = !!item.submenu?.length;
          const disabled = !!item.disabled;
          const isOpen = openTopIdx === i;
          return (
            <li
              key={`mi-${i}`}
              className="relative"
              onMouseEnter={() =>
                hasSub && !disabled
                  ? setOpenTopIdx(i)
                  : setOpenTopIdx((cur) => (cur === i ? null : cur))
              }
              onMouseLeave={() =>
                hasSub && !disabled ? setOpenTopIdx((cur) => (cur === i ? null : cur)) : undefined
              }
            >
              <button
                disabled={disabled}
                onClick={!hasSub && !disabled ? item.action : undefined}
                className={[
                  'w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px]',
                  disabled ? 'text-zinc-400 cursor-not-allowed' : 'hover:bg-zinc-100',
                ].join(' ')}
                type="button"
                data-menu-item
                role="menuitem"
                aria-haspopup={hasSub || undefined}
                aria-expanded={hasSub ? isOpen : undefined}
              >
                <span className="inline-flex items-center gap-2">
                  {item.dotHsl && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: `hsl(${item.dotHsl})` }}
                    />
                  )}
                  {item.Icon && (
                    <item.Icon
                      size={16}
                      weight="bold"
                      color={item.dotHsl ? `hsl(${item.dotHsl})` : undefined}
                    />
                  )}
                  {item.label}
                </span>
                {hasSub && <span className="text-zinc-400">›</span>}
              </button>

              {hasSub && isOpen && (
                <div
                  className="absolute top-0 left-full ml-1 min-w-[220px] rounded-xl border border-hair bg-white/95 shadow-lg"
                  onMouseEnter={() => setOpenTopIdx(i)}
                  onMouseLeave={() => setOpenTopIdx((cur) => (cur === i ? null : cur))}
                >
                  <ul className="py-1" role="menu" aria-label={item.label}>
                    {item.submenu!.map((sub, j) => (
                      <li key={`sub-${i}-${j}`}>
                        <button
                          disabled={!!sub.disabled}
                          onClick={sub.action}
                          className={[
                            'w-full flex items-center gap-2 px-3 py-2 text-[13px]',
                            sub.disabled ? 'text-zinc-400 cursor-not-allowed' : 'hover:bg-zinc-100',
                          ].join(' ')}
                          type="button"
                          data-menu-item
                          role="menuitem"
                        >
                          {sub.dotHsl && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: `hsl(${sub.dotHsl})` }}
                            />
                          )}
                          {sub.Icon && (
                            <sub.Icon
                              size={16}
                              weight="bold"
                              color={sub.dotHsl ? `hsl(${sub.dotHsl})` : undefined}
                            />
                          )}
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
