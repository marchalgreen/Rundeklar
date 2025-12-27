import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowUpDown, Search } from 'lucide-react'
import { FixedSizeList as List } from 'react-window'

export type Column<T> = {
  id: string
  header: string | React.ReactNode
  cell?: (row: T) => React.ReactNode
  accessor?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  sortValue?: (row: T) => string | number
  width?: string
}

/** Sort state for table columns. */
type SortState = {
  columnId: string
  direction: 'asc' | 'desc'
}

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  initialSort?: SortState
  sort?: SortState
  onSortChange?: (sort: SortState | undefined) => void
  emptyState: React.ReactNode
  /** Enable virtualization for large lists (default: true for 50+ items) */
  enableVirtualization?: boolean
  /** Row height in pixels for virtualization (default: 48) */
  rowHeight?: number
}

/**
 * DataTable component — sortable table with scroll position preservation and virtualization.
 * @remarks Preserves scroll position on data updates (especially deletions).
 * Supports controlled or uncontrolled sorting. Automatically enables virtualization for 50+ items.
 */
export function DataTable<T>({ 
  data, 
  columns, 
  initialSort, 
  sort: controlledSort, 
  onSortChange, 
  emptyState,
  enableVirtualization,
  rowHeight = 48
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortState | undefined>(initialSort)
  const sort = controlledSort !== undefined ? controlledSort : internalSort
  const setSort = onSortChange || setInternalSort
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const previousDataLengthRef = useRef<number>(data.length)
  const scrollPositionRef = useRef<number>(0)
  const savedScrollPositionRef = useRef<number | null>(null)
  const shouldPreserveScrollRef = useRef<boolean>(false)
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)

  const sortedData = useMemo(() => {
    if (!sort) return data
    const column = columns.find((col) => col.id === sort.columnId)
    if (!column || !column.sortValue) return data
    const copy = [...data]
    copy.sort((a, b) => {
      const aValue = column.sortValue!(a)
      const bValue = column.sortValue!(b)
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [columns, data, sort])

  // Determine if virtualization should be enabled (must be before useEffect that uses it)
  // Disabled by default - only enable explicitly via enableVirtualization prop
  // This preserves the perfect original view and prevents UI breakage during onboarding
  const shouldVirtualize = enableVirtualization === true

  // Sync horizontal scroll between header and body (only for virtualized tables)
  useEffect(() => {
    if (!shouldVirtualize) return
    
    const scrollContainer = scrollContainerRef.current
    const headerContainer = headerScrollRef.current
    if (!scrollContainer || !headerContainer) return

    // Sync header horizontal scroll with body scroll
    const handleBodyScroll = () => {
      headerContainer.scrollLeft = scrollContainer.scrollLeft
      scrollPositionRef.current = scrollContainer.scrollTop
    }

    scrollContainer.addEventListener('scroll', handleBodyScroll, { passive: true })
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleBodyScroll)
    }
  }, [shouldVirtualize])

  // PERF: Save scroll position right before data changes to prevent jump
  // Only save if scroll position is greater than 0 AND we're not preserving scroll from parent
  // This prevents overwriting scroll positions that parent components explicitly saved
  useEffect(() => {
    const container = scrollContainerRef.current
    if (container && !shouldPreserveScrollRef.current && container.scrollTop > 0) {
      scrollPositionRef.current = container.scrollTop
    }
  })

  // WHY: Restore scroll position after data changes using layout effect to avoid flash
  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const dataLengthChanged = previousDataLengthRef.current !== data.length
    const isDeletion = data.length < previousDataLengthRef.current

    // Check if parent component saved scroll position in data attribute
    // Only use it if it's recent (within last 2 seconds) to avoid stale values
    const savedScrollAttr = container.getAttribute('data-saved-scroll')
    const savedScrollTimeAttr = container.getAttribute('data-saved-scroll-time')
    if (savedScrollAttr && savedScrollTimeAttr) {
      const savedScroll = parseFloat(savedScrollAttr)
      const savedTime = parseFloat(savedScrollTimeAttr)
      const timeSinceSave = Date.now() - savedTime
      // Only use saved scroll if it's recent (within 2 seconds)
      if (savedScroll > 0 && timeSinceSave < 2000) {
        savedScrollPositionRef.current = savedScroll
        shouldPreserveScrollRef.current = true
        container.removeAttribute('data-saved-scroll')
        container.removeAttribute('data-saved-scroll-time')
      }
    }

    // Restore scroll position for deletions (when length decreases)
    if (dataLengthChanged && isDeletion && scrollPositionRef.current > 0) {
      // Restore scroll position synchronously before browser paint
      container.scrollTop = scrollPositionRef.current
      shouldPreserveScrollRef.current = false
    }
    
    // For updates (same length, data changed), restore if we have a saved position
    // This handles cases where parent component saved scroll position before update
    // Also check if we have a saved position from data attribute (for immediate restoration)
    if (!dataLengthChanged) {
      if (savedScrollPositionRef.current !== null && savedScrollPositionRef.current > 0) {
        // Use layout effect to restore synchronously before paint
        container.scrollTop = savedScrollPositionRef.current
        savedScrollPositionRef.current = null
        // Reset preserve flag after a short delay to allow restoration to complete
        setTimeout(() => {
          shouldPreserveScrollRef.current = false
        }, 100)
      } else if (scrollPositionRef.current > 0) {
        // Fallback: restore from scrollPositionRef if we have a saved position
        // This handles cases where scroll was saved but not via data attribute
        container.scrollTop = scrollPositionRef.current
      }
    }

    previousDataLengthRef.current = data.length
  }, [data.length, sortedData.length, data])

  const requestSort = (column: Column<T>) => {
    if (!column.sortable) return
    const newSort: SortState = (() => {
      if (sort?.columnId === column.id) {
        const nextDirection: 'asc' | 'desc' = sort.direction === 'asc' ? 'desc' : 'asc'
        return { columnId: column.id, direction: nextDirection }
      }
      return { columnId: column.id, direction: 'asc' as const }
    })()
    setSort(newSort)
  }

  // Note: react-window handles scrolling internally, so we use fixed heights
  // that match the max-h classes for consistency

  // Calculate total width for container
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => {
      if (col.width) {
        const width = parseInt(col.width.replace('px', ''))
        return sum + width
      }
      return sum + 150 // Default width for columns without explicit width
    }, 0)
  }, [columns])

  // Render row function for virtualization
  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = sortedData[index]
    return (
      <div
        style={style}
        className={clsx(
          'flex',
          index % 2 === 0 ? 'bg-[hsl(var(--surface)/.6)]' : 'bg-[hsl(var(--surface)/.8)]',
          'hover:bg-[hsl(var(--surface)/.95)] transition-colors border-b border-[hsl(var(--line)/.2)]'
        )}
      >
        {columns.map((column) => (
          <div
            key={column.id}
            style={{ 
              width: column.width || '150px',
              minWidth: column.width || '150px',
              maxWidth: column.width || '150px'
            }}
            className={clsx(
              'px-3 py-2 sm:px-4 sm:py-3 text-sm text-[hsl(var(--foreground))] flex-shrink-0',
              column.align === 'center' && 'justify-center text-center',
              column.align === 'right' && 'justify-end text-right'
            )}
          >
            {column.cell ? column.cell(row) : column.accessor ? column.accessor(row) : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg card-glass-active ring-1 ring-[hsl(var(--line)/.12)]">
      {shouldVirtualize ? (
        // Virtualized table layout
        <div className="flex flex-col">
          {/* Table header - sticky, synced with body scroll */}
          <div 
            ref={headerScrollRef}
            className="sticky top-0 z-10 bg-[hsl(var(--surface)/.85)] backdrop-blur border-b border-[hsl(var(--line)/.16)] overflow-hidden"
          >
            <div className="flex" style={{ minWidth: `${totalWidth}px` }}>
              {columns.map((column) => (
                <div
                  key={column.id}
                  style={{ 
                    width: column.width || '150px',
                    minWidth: column.width || '150px',
                    maxWidth: column.width || '150px',
                    flexShrink: 0
                  }}
                  className={clsx(
                    'px-3 py-2 sm:px-4 sm:py-3 text-left text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted))]',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => requestSort(column)}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                    >
                      {column.header}
                      <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : (
                    column.header
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Virtualized body - single scroll container for both vertical and horizontal scrolling */}
          <div 
            ref={scrollContainerRef}
            data-table-container 
            className="max-h-[400px] sm:max-h-[520px] overflow-auto"
            style={{ width: '100%' }}
          >
            {sortedData.length === 0 ? (
              <div className="px-4 py-12 text-center text-[hsl(var(--muted))]">
                {emptyState}
              </div>
            ) : (
              <div style={{ width: `${totalWidth}px`, height: `${sortedData.length * rowHeight}px` }}>
                <List
                  height={400}
                  itemCount={sortedData.length}
                  itemSize={rowHeight}
                  width={totalWidth}
                >
                  {renderRow}
                </List>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Non-virtualized table layout (original)
        <div ref={scrollContainerRef} data-table-container className="max-h-[400px] sm:max-h-[520px] overflow-auto">
          <table className="min-w-full divide-y divide-[hsl(var(--line)/.16)] text-sm">
            <thead className="sticky top-0 z-10 bg-[hsl(var(--surface)/.85)] backdrop-blur">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    style={{ width: column.width }}
                    className={clsx(
                      'px-3 py-2 sm:px-4 sm:py-3 text-left text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted))]',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => requestSort(column)}
                        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                      >
                        {column.header}
                        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={tableBodyRef} className="divide-y divide-[hsl(var(--line)/.25)]">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-[hsl(var(--muted))]">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={clsx(
                      rowIndex % 2 === 0 ? 'bg-[hsl(var(--surface)/.6)]' : 'bg-[hsl(var(--surface)/.8)]',
                      'hover:bg-[hsl(var(--surface)/.95)] transition-colors border-b border-[hsl(var(--line)/.2)]'
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={clsx(
                          'px-3 py-2 sm:px-4 sm:py-3 text-sm text-[hsl(var(--foreground))]',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.cell ? column.cell(row) : column.accessor ? column.accessor(row) : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type TableSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * TableSearch component — search input with clear button.
 * @remarks Accessible search input with aria-label and clear button.
 */
export const TableSearch = ({ value, onChange, placeholder }: TableSearchProps) => {
  const handleClear = () => {
    onChange('')
  }

  return (
    <label className="relative inline-flex w-full max-w-sm items-center">
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[hsl(var(--muted))]" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-[hsl(var(--surface))] px-9 py-2 text-sm ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none"
        type="text"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          aria-label="Ryd søgning"
        >
          ×
        </button>
      )}
    </label>
  )
}
