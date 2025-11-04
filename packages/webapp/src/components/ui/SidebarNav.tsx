import React, { useMemo, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'

export type SidebarItem = {
  label: string
  to: string
  icon: React.ReactNode
}

export type SidebarNavProps = {
  items: SidebarItem[]
  orientation?: 'vertical' | 'horizontal'
  size?: 'sm' | 'lg'
}

export const SidebarNav = ({ items, orientation = 'vertical', size = 'sm' }: SidebarNavProps) => {
  const location = useLocation()
  const refs = useRef<(HTMLAnchorElement | null)[]>([])

  const activeIndex = useMemo(() => {
    const idx = items.findIndex((item) => location.pathname.includes(item.to.replace('#', '')))
    return idx === -1 ? 0 : idx
  }, [items, location.pathname])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusable = refs.current
    if (!focusable.length) return

    const currentIndex = focusable.findIndex((node) => node === document.activeElement)
    const nextIndex = (() => {
      if (event.key === 'ArrowDown' || (event.key === 'ArrowRight' && orientation === 'horizontal')) {
        return (currentIndex + 1) % focusable.length
      }
      if (event.key === 'ArrowUp' || (event.key === 'ArrowLeft' && orientation === 'horizontal')) {
        return (currentIndex - 1 + focusable.length) % focusable.length
      }
      return currentIndex
    })()

    if (nextIndex !== currentIndex && nextIndex >= 0) {
      event.preventDefault()
      focusable[nextIndex]?.focus()
    }
  }

  return (
    <div role="navigation" aria-label="Primær navigation" onKeyDown={handleKeyDown}>
      <ul className={clsx('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row')}>
        {items.map((item, index) => (
          <li key={item.to}>
            <NavLink
              ref={(node: HTMLAnchorElement | null) => {
                refs.current[index] = node
              }}
              to={item.to}
              className={({ isActive }: { isActive: boolean }) =>
                clsx(
                  'btn-press group flex items-center rounded-full font-semibold transition-all ring-focus',
                  size === 'lg' ? 'gap-4 px-5 py-3 text-base' : 'gap-3 px-4 py-2 text-sm',
                  'hover:bg-[hsl(var(--surface-glass)/.9)]',
                  isActive
                    ? 'bg-accent text-[hsl(var(--primary-contrast))] shadow-md'
                    : 'text-[hsl(var(--muted))]'
                )
              }
            >
              <span className={clsx(
                'flex items-center justify-center rounded-full bg-[hsl(var(--surface-glass)/.9)] text-[hsl(var(--foreground))] group-[.active]:bg-transparent',
                size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
              )}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
