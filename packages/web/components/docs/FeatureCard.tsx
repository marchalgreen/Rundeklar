'use client';
import Link from 'next/link';
import { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Calendar, PlugsConnected, Info } from '@phosphor-icons/react';

type IconName = 'calendar' | 'plugs' | 'info';

type BaseProps = {
  title: string;
  description?: string;
  /** Prefer iconName to avoid passing JSX across RSC boundary */
  iconName?: IconName;
  /** Fallback if you really need custom JSX (still client-side) */
  icon?: ReactNode;
  className?: string;
};

type Linkable = BaseProps & { href: string; cta?: string };
type StaticCard = BaseProps & { href?: undefined; cta?: undefined };
type Props = Linkable | StaticCard;

function renderIcon(name?: IconName, fallback?: ReactNode) {
  const map: Record<IconName, ReactNode> = {
    calendar: <Calendar size={18} />,
    plugs: <PlugsConnected size={18} />,
    info: <Info size={18} />,
  };
  return fallback ?? (name ? map[name] : null);
}

/**
 * Soft-glass card for docs landing/notes. Uses a light ring instead of a dark border,
 * gentle elevation, and a subtle hover glow. No hard “black” borders anywhere.
 */
export default function FeatureCard(props: Props) {
  const { title, description, iconName, icon, className } = props;
  const hasHref = 'href' in props && typeof props.href === 'string';
  const cta = hasHref ? props.cta ?? 'Learn more →' : undefined;
  const Container: any = hasHref ? Link : 'div';
  const containerProps = hasHref ? { href: props.href } : {};

  return (
    <Container
      {...containerProps}
      className={cn(
        'group relative grid grid-cols-[auto,1fr] items-start gap-3 rounded-2xl',
        'ring-1 ring-[hsl(var(--line))/0.14] bg-gradient-to-br from-white/82 to-white/60 backdrop-blur',
        'shadow-[0_8px_24px_hsl(var(--accent-blue)/0.06)]',
        'transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_14px_32px_hsl(var(--accent-blue)/0.12)]',
        'p-4',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'relative isolate flex h-9 w-9 items-center justify-center',
          'rounded-full ring-1 ring-[hsl(var(--line))/0.16]',
          'bg-[hsl(var(--accent-blue))/0.08]',
          'shadow-[0_6px_18px_hsl(var(--accent-blue)/0.10)]',
          'before:absolute before:-inset-3 before:-z-10 before:rounded-full before:opacity-70 before:blur-[12px] before:content-[""]',
          'before:bg-[radial-gradient(circle_at_center,hsl(var(--accent-blue))/0.38,transparent)]',
          'transition-transform duration-300 ease-out group-hover:scale-[1.06]',
        )}
      >
        <span className="text-[hsl(var(--accent-blue))]">{renderIcon(iconName, icon)}</span>
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold leading-none tracking-tight">{title}</span>
        </div>
        {description ? <p className="text-sm text-foreground/80">{description}</p> : null}
        {hasHref && cta ? (
          <span className="mt-2 inline-block text-sm font-medium text-[hsl(var(--accent-blue))] underline-offset-2 group-hover:underline">
            {cta}
          </span>
        ) : null}
      </div>
    </Container>
  );
}
