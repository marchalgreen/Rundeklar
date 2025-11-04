'use client';

import React, { useMemo } from 'react';

type Props = {
  pxPerMin: number;
  dayStart: number;
  dayEnd: number;
};

export default function TimeAxis({ pxPerMin, dayStart, dayEnd }: Props) {
  const totalMin = (dayEnd - dayStart) * 60;
  const hours = useMemo(
    () => Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i),
    [dayStart, dayEnd]
  );

  const topFor = (h: number, m: number) => ((h - dayStart) * 60 + m) * pxPerMin;

  return (
    <div className="relative select-none" style={{ height: totalMin * pxPerMin }}>
      {hours.map((h, idx) => {
        const isLast = idx === hours.length - 1;
        const hourTop = topFor(h, 0);
        const halfTop = topFor(h, 30);

        return (
          <div key={h}>
            {/* Hour label */}
            <div
              className="absolute right-2 text-xs tabular-nums text-muted-foreground bg-paper pr-1"
              style={{ top: hourTop - 12 }} // was -10, moved up a bit more
            >
              {h.toString().padStart(2, '0')}.00
            </div>

            {/* Hour tick line */}
            <div className="absolute right-0 w-3 border-t border-hair" style={{ top: hourTop }} />

            {/* Half-hour tick line */}
            {!isLast && (
              <div
                className="absolute right-0 w-2 border-t border-hair/50"
                style={{ top: halfTop }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
