// components/FaviconBadge.tsx
'use client';
import { useEffect } from 'react';
import { setFaviconBadge } from '../lib/faviconBadge';
import { useNotifications } from '@/store/notifications';

export default function FaviconBadge({ count, dot = false }: { count?: number; dot?: boolean }) {
  const unread = useNotifications((s) => s.unread);

  useEffect(() => {
    const c = typeof count === 'number' ? count : unread;
    setFaviconBadge({
      count: c,
      dot,
      baseIcon: '/favicon.svg',
      // if your helper supports color, pass it; otherwise it will keep its default:
      // color: '#0284c7' // sky-600
    });
  }, [count, dot, unread]);

  return null;
}
