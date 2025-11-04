'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Code as CodeIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface DevToggleProps {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** legacy compat */
  description?: string;
}

export function DevToggle({
  title = 'Developer details',
  children,
  defaultOpen = false,
  description,
}: DevToggleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/50 bg-background/70 shadow-sm">
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground transition-colors',
          open ? 'bg-[hsl(var(--accent-blue))/0.08]' : 'bg-transparent hover:bg-muted/50',
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <CodeIcon
            aria-hidden
            className="size-4 text-[hsl(var(--accent-blue))]"
            weight="duotone"
          />
          <span>{title}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 transition-transform',
            open ? 'rotate-180 text-[hsl(var(--accent-blue))]' : '',
          )}
        />
      </button>

      <div
        className={cn('grid transition-all', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        aria-hidden={!open}
      >
        <div className="overflow-hidden border-t border-border/50 px-4 py-4 text-sm text-foreground/80">
          {open ? (
            <>
              {description ? (
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {description}
                </p>
              ) : null}
              {children}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
