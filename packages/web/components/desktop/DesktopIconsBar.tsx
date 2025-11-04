'use client';

import DesktopIcon from '@/components/desktop/DesktopIcon';
import { Calendar } from 'lucide-react';
import { useDesktop } from '@/store/desktop';

export default function DesktopIconsBar() {
  const open = useDesktop((s) => s.open);

  return (
    <div className="pointer-events-auto flex flex-col gap-3 p-3">
      <DesktopIcon
        id="launcher-booking-desktop"
        label="Booking Kalender"
        Icon={Calendar}
        onOpen={() => {
          open({
            type: 'booking_calendar',
            title: 'Kalender',
          });
        }}
      />
      {/* Add more icons here later */}
    </div>
  );
}
