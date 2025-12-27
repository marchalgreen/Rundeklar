import { useState, useCallback, useMemo } from 'react'

/**
 * Options for useSelection hook.
 */
export interface UseSelectionOptions<T> {
  /** Optional initial selected items. */
  initialSelected?: Set<T>
  /** Optional callback when selection changes. */
  onSelectionChange?: (selected: Set<T>) => void
}

/**
 * Return type for useSelection hook.
 */
export interface UseSelectionReturn<T> {
  /** Set of currently selected items. */
  selected: Set<T>
  /** Toggle selection of a single item. */
  toggle: (item: T) => void
  /** Toggle selection of all items. */
  toggleAll: (items: T[]) => void
  /** Select a single item. */
  select: (item: T) => void
  /** Deselect a single item. */
  deselect: (item: T) => void
  /** Select multiple items. */
  selectMany: (items: T[]) => void
  /** Deselect multiple items. */
  deselectMany: (items: T[]) => void
  /** Clear all selections. */
  clear: () => void
  /** Check if an item is selected. */
  isSelected: (item: T) => boolean
  /** Check if all items are selected. */
  isAllSelected: (items: T[]) => boolean
  /** Check if any items are selected. */
  hasSelection: boolean
  /** Number of selected items. */
  selectedCount: number
}

/**
 * Custom hook for managing selection state (checkboxes, multi-select, etc.).
 * 
 * @param options - Hook configuration options
 * @returns Selection state and helper functions
 * 
 * @example
 * ```typescript
 * const { selected, toggle, toggleAll, clear } = useSelection<string>()
 * 
 * // Toggle single item
 * toggle('item-id')
 * 
 * // Toggle all items
 * toggleAll(['id1', 'id2', 'id3'])
 * 
 * // Check if selected
 * if (isSelected('item-id')) { ... }
 * ```
 */
export function useSelection<T = string>(
  options: UseSelectionOptions<T> = {}
): UseSelectionReturn<T> {
  const { initialSelected, onSelectionChange } = options
  
  const [selected, setSelected] = useState<Set<T>>(initialSelected ?? new Set())

  const toggle = useCallback((item: T) => {
    setSelected((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(item)) {
        newSet.delete(item)
      } else {
        newSet.add(item)
      }
      onSelectionChange?.(newSet)
      return newSet
    })
  }, [onSelectionChange])

  const toggleAll = useCallback((items: T[]) => {
    setSelected((prev) => {
      const allSelected = items.length > 0 && items.every(item => prev.has(item))
      const newSet = allSelected ? new Set<T>() : new Set(items)
      onSelectionChange?.(newSet)
      return newSet
    })
  }, [onSelectionChange])

  const select = useCallback((item: T) => {
    setSelected((prev) => {
      if (prev.has(item)) return prev
      const newSet = new Set(prev)
      newSet.add(item)
      onSelectionChange?.(newSet)
      return newSet
    })
  }, [onSelectionChange])

  const deselect = useCallback((item: T) => {
    setSelected((prev) => {
      if (!prev.has(item)) return prev
      const newSet = new Set(prev)
      newSet.delete(item)
      onSelectionChange?.(newSet)
      return newSet
    })
  }, [onSelectionChange])

  const selectMany = useCallback((items: T[]) => {
    setSelected((prev) => {
      const newSet = new Set(prev)
      items.forEach(item => newSet.add(item))
      if (newSet.size === prev.size) return prev // No changes
      onSelectionChange?.(newSet)
      return newSet
    })
  }, [onSelectionChange])

  const deselectMany = useCallback((items: T[]) => {
    setSelected((prev) => {
      const newSet = new Set(prev)
      let changed = false
      items.forEach(item => {
        if (newSet.has(item)) {
          newSet.delete(item)
          changed = true
        }
      })
      if (!changed) return prev
      onSelectionChange?.(newSet)
      return newSet
    })
  }, [onSelectionChange])

  const clear = useCallback(() => {
    setSelected(new Set())
    onSelectionChange?.(new Set())
  }, [onSelectionChange])

  const isSelected = useCallback((item: T) => {
    return selected.has(item)
  }, [selected])

  const isAllSelected = useCallback((items: T[]) => {
    return items.length > 0 && items.every(item => selected.has(item))
  }, [selected])

  const hasSelection = useMemo(() => selected.size > 0, [selected.size])
  const selectedCount = useMemo(() => selected.size, [selected.size])

  return {
    selected,
    toggle,
    toggleAll,
    select,
    deselect,
    selectMany,
    deselectMany,
    clear,
    isSelected,
    isAllSelected,
    hasSelection,
    selectedCount
  }
}

