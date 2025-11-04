import React, { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowUpDown, Search } from 'lucide-react'

export type Column<T> = {
  id: string
  header: string
  cell?: (row: T) => React.ReactNode
  accessor?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  sortValue?: (row: T) => string | number
  width?: string
}

type SortState = {
  columnId: string
  direction: 'asc' | 'desc'
}

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  initialSort?: SortState
  emptyState: React.ReactNode
}

export function DataTable<T>({ data, columns, initialSort, emptyState }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort)

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

  const requestSort = (column: Column<T>) => {
    if (!column.sortable) return
    setSort((prev) => {
      if (prev?.columnId === column.id) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc'
        return { columnId: column.id, direction: nextDirection }
      }
      return { columnId: column.id, direction: 'asc' }
    })
  }

  return (
    <div className="overflow-hidden rounded-lg card-glass-active ring-1 ring-[hsl(var(--line)/.12)]">
      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full divide-y divide-[hsl(var(--line)/.16)] text-sm">
          <thead className="sticky top-0 z-10 bg-[hsl(var(--surface)/.85)] backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  style={{ width: column.width }}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted))]',
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
          <tbody className="divide-y divide-[hsl(var(--line)/.1)]">
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
                    'hover:bg-[hsl(var(--surface)/.95)] transition-colors'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={clsx(
                        'px-4 py-3 text-sm text-[hsl(var(--foreground))]',
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
    </div>
  )
}

type TableSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const TableSearch = ({ value, onChange, placeholder }: TableSearchProps) => (
  <label className="relative inline-flex w-full max-w-sm items-center">
    <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[hsl(var(--muted))]" aria-hidden />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-full bg-[hsl(var(--surface))] px-9 py-2 text-sm ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none"
      type="search"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-3 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        aria-label="Ryd søgning"
      >
        ×
      </button>
    )}
  </label>
)
