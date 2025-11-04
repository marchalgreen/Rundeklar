'use client';

import { useEffect, useState } from 'react';

function fmt(now: Date) {
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  return { time, date };
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // SSR-safe placeholder; prevents hydration mismatch
  if (!now) {
    return (
      <div
        className="text-xs text-zinc-600 tabular-nums select-none ml-1 mr-1"
        suppressHydrationWarning
      >
        <span className="mr-0.5">--:--</span>
        <span>-- ---</span>
      </div>
    );
  }

  const { time, date } = fmt(now);

  return (
    <div className="text-xs text-zinc-600 tabular-nums select-none ml-1 mr-1">
      <span className="mr-0.5">{time}</span>
      <span>{date}</span>
    </div>
  );
}