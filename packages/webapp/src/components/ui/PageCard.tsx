import React, { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

export type PageCardProps = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean
}

export const PageCard = ({ className, hover = true, ...props }: PageCardProps) => (
  <div
    className={clsx(
      'card-glass-active ring-1 ring-[hsl(var(--line)/.12)] rounded-lg p-6 shadow-sm transition-transform',
      hover && 'hover:-translate-y-0.5',
      className
    )}
    {...props}
  />
)