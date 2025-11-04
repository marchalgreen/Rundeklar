'use client';

import * as React from 'react';
import { Info, Warning, XCircle } from '@phosphor-icons/react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CalloutTone = 'info' | 'warning' | 'danger';

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
  title?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  badgeProps?: BadgeProps;
}

/** Legacy support (variant → tone) */
type LegacyVariant = 'info' | 'success' | 'warning' | 'danger' | 'note';
type LegacyProps = { variant?: LegacyVariant; icon?: unknown };

function mapLegacyVariantToTone(v?: LegacyVariant): CalloutTone {
  if (!v || v === 'info' || v === 'success' || v === 'note') return 'info';
  if (v === 'warning') return 'warning';
  return 'danger';
}

const toneIcon: Record<CalloutTone, React.ReactNode> = {
  info: <Info size={18} />,
  warning: <Warning size={18} />,
  danger: <XCircle size={18} />,
};

const toneBadge: Record<CalloutTone, BadgeProps['variant']> = {
  info: 'secondary',
  warning: 'warn',
  danger: 'danger',
};

const tonePill: Record<CalloutTone, string> = {
  info: 'ring-[hsl(var(--accent-blue))/0.18] bg-[hsl(var(--accent-blue))/0.08] before:bg-[radial-gradient(circle_at_center,hsl(var(--accent-blue))/0.42,transparent)]',
  warning:
    'ring-[hsl(var(--svc-pickup))/0.20] bg-[hsl(var(--svc-pickup))/0.10] before:bg-[radial-gradient(circle_at_center,hsl(var(--svc-pickup))/0.44,transparent)]',
  danger:
    'ring-[hsl(var(--svc-repair))/0.20] bg-[hsl(var(--svc-repair))/0.10] before:bg-[radial-gradient(circle_at_center,hsl(var(--svc-repair))/0.44,transparent)]',
};

function CalloutComponent(props: CalloutProps & LegacyProps) {
  const {
    tone,
    title,
    badge,
    className,
    children,
    badgeProps,
    variant,
    icon: _legacy,
    ...rest
  } = props;

  const resolvedTone: CalloutTone = tone ?? mapLegacyVariantToTone(variant);
  const headingId = React.useId();

  return (
    <div
      role="note"
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        // Layout: two columns (icon + text)
        'group relative grid grid-cols-[44px,1fr] items-start gap-4 rounded-2xl p-4',
        // Soft glass container
        'ring-1 ring-[hsl(var(--line))/0.14)]',
        'bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.82),rgba(255,255,255,0.60))] backdrop-blur',
        'shadow-[0_8px_24px_hsl(var(--accent-blue)/0.06)] transition-all duration-300 ease-out',
        'hover:scale-[1.01] hover:shadow-[0_14px_32px_hsl(var(--accent-blue)/0.12)]',
        className,
      )}
      {...rest}
    >
      {/* Left icon pill with circular halo */}
      <div
        aria-hidden
        className={cn(
          'relative isolate flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full',
          'ring-2 ring-[hsl(var(--line))/0.18] shadow-[0_6px_20px_hsl(var(--accent-blue)/0.10)]',
          'before:absolute before:-inset-3 before:-z-10 before:rounded-full before:opacity-70 before:blur-[14px] before:content-[""]',
          'after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-white/50 after:content-[""]',
          'transition-transform duration-300 ease-out group-hover:scale-[1.06]',
          tonePill[resolvedTone],
        )}
      >
        <span className="flex items-center justify-center text-[hsl(var(--accent-blue))]">
          {toneIcon[resolvedTone]}
        </span>
      </div>

      {/* Text content */}
      <div className="min-w-0">
        {title ? (
          <div id={headingId} className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold leading-none tracking-tight">{title}</span>
            {badge ? (
              <Badge variant={toneBadge[resolvedTone]} className="rounded-full" {...badgeProps}>
                {badge}
              </Badge>
            ) : null}
          </div>
        ) : null}
        <div className="text-sm text-foreground/80">{children}</div>
      </div>
    </div>
  );
}

// Export both styles so either import works:
//   import Callout from '...'
//   import { Callout } from '...'
export { CalloutComponent as Callout };
export default CalloutComponent;
