'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

type SectionCardProps = {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  hue?: number;
};

const base =
  'rounded-2xl border border-border card-surface p-4 md:p-5 space-y-4';
const headerBase = 'flex items-center justify-between gap-3 mb-2';

const titleBase = 'flex items-center gap-2 text-sm font-medium text-foreground/85';

export const SectionCard = React.forwardRef<HTMLElement, SectionCardProps>(
  ({ id, title, children, icon, actions, className, contentClassName, hue }, ref) => {
    const labelId = `${id}-label`;
    const tintStyle =
      typeof hue === 'number'
        ? { boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }
        : undefined;
    return (
      <section
        id={id}
        ref={ref}
        role="region"
        aria-labelledby={labelId}
        data-section-id={id}
        className={cn(base, className)}
        style={tintStyle}
      >
        <div className={headerBase} id={labelId}>
          <div className={titleBase}>
            {icon ? <span className="text-foreground/70">{icon}</span> : null}
            <span>{title}</span>
          </div>
          {actions ? <div className="flex items-center gap-2 text-xs text-foreground/60">{actions}</div> : null}
        </div>
        <div className="border-b border-white/10 pb-2" />
        <div className={cn('space-y-4', contentClassName)}>{children}</div>
      </section>
    );
  }
);

SectionCard.displayName = 'SectionCard';
