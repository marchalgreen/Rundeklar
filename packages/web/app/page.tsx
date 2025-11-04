'use client';

import DesktopShell from '@/components/desktop/DesktopShell';

// No manual rehydrate necessary; persist+migrate handles it.
export default function HomePage() {
  return <DesktopShell />;
}
