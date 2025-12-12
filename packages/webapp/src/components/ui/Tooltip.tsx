/**
 * Tooltip component — simple hover tooltip matching platform styling.
 * 
 * Displays a tooltip on hover with gray background matching platform design.
 */

import React, { useState } from 'react'
import { clsx } from 'clsx'

export type TooltipProps = {
  /** Tooltip content to display */
  content: string
  /** Child element that triggers the tooltip */
  children: React.ReactElement
  /** Optional className for the tooltip wrapper */
  className?: string
  /** Optional position preference */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Tooltip component.
 * 
 * @example
 * ```tsx
 * <Tooltip content="Player notes">
 *   <Info className="w-4 h-4" />
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div
      className={clsx('relative inline-flex', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={clsx(
            'absolute z-50 px-3 py-2',
            'bg-[hsl(215_22%_96%)] text-[hsl(var(--foreground))]',
            'text-xs font-normal',
            'rounded-md shadow-md',
            'border border-[hsl(var(--line)/.12)]',
            'pointer-events-none',
            'whitespace-normal',
            'transition-opacity duration-150',
            positionClasses[position]
          )}
          style={{ 
            maxWidth: '600px',
            width: 'max-content',
            wordBreak: 'normal',
            whiteSpace: 'normal'
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
