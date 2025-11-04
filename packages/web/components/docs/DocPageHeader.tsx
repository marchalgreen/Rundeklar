import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Minimal, consistent page header for docs pages.
 * Used inside UnifiedDocLayout — no extra containers, only typography/spacing.
 */
export function DocPageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <header className={cn('mb-6 space-y-2', className)}>
      {eyebrow ? (
        <p className="text-xs tracking-wide text-[hsl(var(--muted))] uppercase">{eyebrow}</p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">{title}</h1>
        {actions}
      </div>

      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted))]">{description}</p>
      ) : null}
    </header>
  );
}

// Support both import styles:
//   import DocPageHeader from '...'
//   import { DocPageHeader } from '...'
export default DocPageHeader;
