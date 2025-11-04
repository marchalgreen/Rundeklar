'use client';

import Taskbar from './Taskbar';
import WindowRegistry from './windowRegistry';
import TopBar from './TopBar';
import { useDesktop } from '@/store/desktop';
import { useShallow } from 'zustand/react/shallow';
import GlobalHotkeys from '@/components/GlobalHotkeys';
import GlobalSearchHotkey from './GlobalSearchHotkey';
import SearchOverlay from './SearchOverlay';
import WidgetRegistry from '@/components/desktop/WidgetRegistry';
import DesktopIconsRegistry from '@/components/desktop/DesktopIconsRegistry';

export default function DesktopShell() {
  const { windows, order } = useDesktop(
    useShallow((s) => ({ windows: s.windows, order: s.order }))
  );

  // Is there a focused, non-minimized window?
  const focusedId = order[order.length - 1] ?? null;
  const focusedActive = !!focusedId && windows[focusedId] && windows[focusedId].minimized !== true;

  return (
    <div className="relative min-h-screen app-bg" data-desk={focusedActive ? 'muted' : 'idle'}>
      {/* Top navigation */}
      <TopBar />

      {/* Global keyboard features */}
      <GlobalHotkeys />
      <GlobalSearchHotkey />
      <SearchOverlay />

      {/* Icons */}
      <div className="absolute inset-0 z-10 p-6 pt-[84px]">
        <DesktopIconsRegistry />
      </div>

      {/* Widgets */}
      <div className="absolute inset-0 z-[15] pointer-events-none">
        <div className="pointer-events-auto">
          <WidgetRegistry />
        </div>
      </div>

      {/* App windows */}
      <div className="relative z-20 pt-[84px]">
        <WindowRegistry />
      </div>

      {/* Taskbar */}
      <div className="relative z-30">
        <Taskbar />
      </div>
    </div>
  );
}
