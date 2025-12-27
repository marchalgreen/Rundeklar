import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelection } from '../../../src/hooks/useSelection'

describe('useSelection', () => {
  describe('initialization', () => {
    it('should initialize with empty set by default', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      expect(result.current.selected.size).toBe(0)
      expect(result.current.hasSelection).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('should initialize with provided initial selected items', () => {
      const initial = new Set(['item1', 'item2'])
      const { result } = renderHook(() => useSelection({ initialSelected: initial }))
      
      expect(result.current.selected.size).toBe(2)
      expect(result.current.isSelected('item1')).toBe(true)
      expect(result.current.isSelected('item2')).toBe(true)
      expect(result.current.hasSelection).toBe(true)
    })

    it('should call onSelectionChange when provided', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() => useSelection({ onSelectionChange }))
      
      act(() => {
        result.current.toggle('item1')
      })
      
      expect(onSelectionChange).toHaveBeenCalledTimes(1)
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['item1']))
    })
  })

  describe('toggle', () => {
    it('should add item when not selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.toggle('item1')
      })
      
      expect(result.current.isSelected('item1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
    })

    it('should remove item when already selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.toggle('item1')
        result.current.toggle('item1')
      })
      
      expect(result.current.isSelected('item1')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('should handle multiple items', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.toggle('item1')
        result.current.toggle('item2')
        result.current.toggle('item3')
      })
      
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isSelected('item1')).toBe(true)
      expect(result.current.isSelected('item2')).toBe(true)
      expect(result.current.isSelected('item3')).toBe(true)
    })
  })

  describe('toggleAll', () => {
    it('should select all items when none are selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      const items = ['item1', 'item2', 'item3']
      
      act(() => {
        result.current.toggleAll(items)
      })
      
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isAllSelected(items)).toBe(true)
    })

    it('should deselect all items when all are selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      const items = ['item1', 'item2', 'item3']
      
      act(() => {
        result.current.toggleAll(items)
        result.current.toggleAll(items)
      })
      
      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected(items)).toBe(false)
    })

    it('should select all items when some are selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      const items = ['item1', 'item2', 'item3']
      
      act(() => {
        result.current.select('item1')
        result.current.toggleAll(items)
      })
      
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isAllSelected(items)).toBe(true)
    })

    it('should handle empty array', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.toggleAll([])
      })
      
      expect(result.current.selectedCount).toBe(0)
    })
  })

  describe('select and deselect', () => {
    it('should select item', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.select('item1')
      })
      
      expect(result.current.isSelected('item1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
    })

    it('should not duplicate when selecting already selected item', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.select('item1')
        result.current.select('item1')
      })
      
      expect(result.current.selectedCount).toBe(1)
    })

    it('should deselect item', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.select('item1')
        result.current.deselect('item1')
      })
      
      expect(result.current.isSelected('item1')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('should not change when deselecting non-selected item', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.select('item1')
        result.current.deselect('item2')
      })
      
      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSelected('item1')).toBe(true)
    })
  })

  describe('selectMany and deselectMany', () => {
    it('should select multiple items', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.selectMany(['item1', 'item2', 'item3'])
      })
      
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isSelected('item1')).toBe(true)
      expect(result.current.isSelected('item2')).toBe(true)
      expect(result.current.isSelected('item3')).toBe(true)
    })

    it('should not duplicate when selecting already selected items', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.select('item1')
        result.current.selectMany(['item1', 'item2'])
      })
      
      expect(result.current.selectedCount).toBe(2)
    })

    it('should deselect multiple items', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.selectMany(['item1', 'item2', 'item3'])
        result.current.deselectMany(['item1', 'item2'])
      })
      
      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSelected('item3')).toBe(true)
    })

    it('should handle deselecting non-selected items gracefully', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.select('item1')
        result.current.deselectMany(['item2', 'item3'])
      })
      
      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSelected('item1')).toBe(true)
    })
  })

  describe('clear', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      act(() => {
        result.current.selectMany(['item1', 'item2', 'item3'])
        result.current.clear()
      })
      
      expect(result.current.selectedCount).toBe(0)
      expect(result.current.hasSelection).toBe(false)
    })

    it('should call onSelectionChange when clearing', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() => useSelection({ onSelectionChange }))
      
      act(() => {
        result.current.select('item1')
        result.current.clear()
      })
      
      expect(onSelectionChange).toHaveBeenLastCalledWith(new Set())
    })
  })

  describe('isAllSelected', () => {
    it('should return true when all items are selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      const items = ['item1', 'item2', 'item3']
      
      act(() => {
        result.current.selectMany(items)
      })
      
      expect(result.current.isAllSelected(items)).toBe(true)
    })

    it('should return false when some items are not selected', () => {
      const { result } = renderHook(() => useSelection<string>())
      const items = ['item1', 'item2', 'item3']
      
      act(() => {
        result.current.select('item1')
      })
      
      expect(result.current.isAllSelected(items)).toBe(false)
    })

    it('should return false for empty array', () => {
      const { result } = renderHook(() => useSelection<string>())
      
      expect(result.current.isAllSelected([])).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle numeric IDs', () => {
      const { result } = renderHook(() => useSelection<number>())
      
      act(() => {
        result.current.toggle(1)
        result.current.toggle(2)
      })
      
      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected(1)).toBe(true)
      expect(result.current.isSelected(2)).toBe(true)
    })

    it('should handle object IDs', () => {
      type ObjectId = { id: string }
      const { result } = renderHook(() => useSelection<ObjectId>())
      const id1: ObjectId = { id: '1' }
      const id2: ObjectId = { id: '2' }
      
      act(() => {
        result.current.toggle(id1)
        result.current.toggle(id2)
      })
      
      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected(id1)).toBe(true)
      expect(result.current.isSelected(id2)).toBe(true)
    })
  })
})

