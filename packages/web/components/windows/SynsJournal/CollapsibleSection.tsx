'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  id?: string;
  defaultCollapsed?: boolean;
  onToggle?: (expanded: boolean) => void;
  tooltip?: string;
  className?: string;
  bodyClassName?: string;
  buttonClassName?: string;
  wrapInCard?: boolean;
  cardHue?: number;
};

const TRANSITION = 'max-height 200ms cubic-bezier(.2,.8,.2,1), opacity 180ms cubic-bezier(.2,.8,.2,1)';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCE_QUERY);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(!!event.matches);
    };
    handleChange(mq);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    if (typeof mq.addListener === 'function') {
      mq.addListener(handleChange);
      return () => mq.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

export function CollapsibleSection({
  title,
  children,
  icon,
  id,
  defaultCollapsed = true,
  onToggle,
  tooltip,
  className,
  bodyClassName,
  buttonClassName,
  wrapInCard = false,
  cardHue,
}: CollapsibleSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const buttonId = `${id ?? `collapsible-${useId()}`}-btn`;
  const panelId = `${buttonId}-panel`;
  const contentRef = useRef<HTMLDivElement | null>(null);

  const setContentStyles = useCallback(
    (display: 'block' | 'none', maxHeight: string, opacity: string) => {
      const el = contentRef.current;
      if (!el) return;
      el.style.display = display;
      el.style.maxHeight = maxHeight;
      el.style.opacity = opacity;
    },
    []
  );

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (prefersReducedMotion) {
      setContentStyles(expanded ? 'block' : 'none', '', '');
      el.style.transition = '';
      return;
    }

    el.style.transition = TRANSITION;

    if (expanded) {
      el.style.display = 'block';
      const run = () => {
        if (!contentRef.current) return;
        const target = contentRef.current;
        target.style.maxHeight = `${target.scrollHeight}px`;
        target.style.opacity = '1';
      };
      requestAnimationFrame(run);
      const handleEnd = (event: TransitionEvent) => {
        if (event.target === el && event.propertyName === 'max-height') {
          el.style.maxHeight = 'none';
        }
      };
      el.addEventListener('transitionend', handleEnd);
      return () => el.removeEventListener('transitionend', handleEnd);
    }

    el.style.maxHeight = `${el.scrollHeight}px`;
    el.style.opacity = '1';
    requestAnimationFrame(() => {
      if (!contentRef.current) return;
      contentRef.current.style.maxHeight = '0px';
      contentRef.current.style.opacity = '0';
    });
    const handleEnd = (event: TransitionEvent) => {
      if (event.target === el && event.propertyName === 'max-height') {
        el.style.display = 'none';
      }
    };
    el.addEventListener('transitionend', handleEnd);
    return () => el.removeEventListener('transitionend', handleEnd);
  }, [expanded, prefersReducedMotion, setContentStyles]);

  const buttonBase = wrapInCard
    ? 'flex w-full items-center justify-between rounded-t-xl border-none bg-transparent px-3 py-3 text-left transition-colors hover:bg-surface/80'
    : 'flex w-full items-center justify-between rounded-lg border border-border/80 bg-surface/70 px-3 py-2 text-left transition-colors hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0';

  const buttonClasses = cn(
    buttonBase,
    !wrapInCard && expanded && 'bg-surface/75',
    wrapInCard && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0 rounded-t-xl',
    buttonClassName
  );

  const panelBase = wrapInCard
    ? 'overflow-hidden border-t border-border/70'
    : 'overflow-hidden rounded-xl border border-border card-surface';

  const panelClass = cn(
    panelBase,
    prefersReducedMotion && !expanded && 'hidden',
    bodyClassName
  );

  const content = (
    <>
      <button
        id={buttonId}
        type="button"
        className={buttonClasses}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' && event.shiftKey) || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        }}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground/85">
          {icon && <span className="text-foreground/70">{icon}</span>}
          {tooltip ? (
            <TooltipProvider delayDuration={80}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5">
                    <span>{title}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-[280px] text-xs leading-snug">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span>{title}</span>
          )}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            'text-foreground/60 transition-transform duration-200',
            expanded ? 'rotate-180' : 'rotate-0'
          )}
        >
          ▾
        </span>
      </button>
      <div
        ref={contentRef}
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={panelClass}
        style={
          prefersReducedMotion
            ? { display: expanded ? 'block' : 'none' }
            : { maxHeight: expanded ? 'none' : '0px', opacity: expanded ? 1 : 0 }
        }
      >
        <div className="p-3">{children}</div>
      </div>
    </>
  );

  if (wrapInCard) {
    return (
      <div className={cn(className)}>
        <div
          className={cn('rounded-xl border border-border card-surface')}
          style={
            typeof cardHue === 'number'
              ? { boxShadow: `inset 0 3px 0 hsl(${cardHue} 90% 88% / .45)` }
              : undefined
          }
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      {content}
    </div>
  );
}
