'use client';

import { cn } from '@/lib/utils/cn';
import { UserCircle } from '@phosphor-icons/react';

export default function ProfileBadge({
  employee,
  online,
  onErrorAvatar,
}: {
  employee: { slug: string; name: string } | null;
  online: boolean | null;
  onErrorAvatar: () => void;
}) {
  return (
    <a
      href="/login"
      title={employee ? `${employee.name} — klik for at skifte` : 'Vælg medarbejder'}
      className={cn(
        'inline-flex h-[42px] items-center gap-2 rounded-xl pl-1 pr-2',
        'bg-white/70 ring-1 ring-white/60 shadow-sm hover:bg-white/80',
        'transition-all duration-250 ease-[cubic-bezier(.22,.7,.2,1)]',
      )}
      style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <span className="relative inline-block h-7 w-7 rounded-full ring-2 ring-sky-300/60 bg-sky-500/10">
        {employee ? (
          <img
            src={`/employees/${employee.slug}.png`}
            alt={employee.name}
            loading="lazy"
            className="h-full w-full rounded-full object-cover object-top"
            onError={onErrorAvatar}
          />
        ) : (
          <UserCircle className="h-full w-full rounded-full p-1 text-zinc-600" />
        )}

        {/* Status dot (no longer clipped) */}
        <span
          suppressHydrationWarning
          title={online === null ? '' : online ? 'Online' : 'Offline – ændringer køres i kø'}
          className={cn(
            'absolute -right-0.5 -bottom-0.5 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-white',
            online === null ? 'bg-zinc-300' : online ? 'bg-emerald-500' : 'bg-amber-500',
          )}
        />
      </span>

      <span className="hidden sm:inline max-w-[160px] truncate text-[13px] text-zinc-700">
        {employee ? employee.name : 'Ingen medarbejder'}
      </span>
    </a>
  );
}
