/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useScrollRestoration } from '../../../src/hooks/useScrollRestoration'

describe('useScrollRestoration', () => {
  let mockElement: HTMLElement

  beforeEach(() => {
    // Create a mock scrollable element
    mockElement = document.createElement('div')
    mockElement.style.height = '1000px'
    mockElement.style.overflow = 'auto'
    document.body.appendChild(mockElement)
    
    // Mock scrollTop property
    Object.defineProperty(mockElement, 'scrollTop', {
      writable: true,
      value: 0
    })
  })

  afterEach(() => {
    document.body.removeChild(mockElement)
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with scroll position 0', () => {
      const { result } = renderHook(() => useScrollRestoration())
      
      expect(result.current.getScrollPosition()).toBe(0)
    })

    it('should initialize with window as default container', () => {
      const { result } = renderHook(() => useScrollRestoration())
      
      // Should be able to save/restore window scroll
      act(() => {
        result.current.setScrollPosition(100)
      })
      
      expect(result.current.getScrollPosition()).toBe(100)
    })

    it('should accept container as HTMLElement', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 200
        result.current.saveScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(200)
    })

    it('should accept container as CSS selector string', () => {
      mockElement.setAttribute('data-test-container', 'true')
      const { result } = renderHook(() => useScrollRestoration({
        container: '[data-test-container="true"]'
      }))
      
      act(() => {
        mockElement.scrollTop = 150
        result.current.saveScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(150)
    })
  })

  describe('saveScrollPosition', () => {
    it('should save window scroll position', () => {
      const { result } = renderHook(() => useScrollRestoration())
      
      act(() => {
        window.scrollY = 300
        window.pageYOffset = 300
        result.current.saveScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(300)
    })

    it('should save element scroll position', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 250
        result.current.saveScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(250)
    })

    it('should not save position if scrollTop is 0', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 0
        result.current.saveScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(0)
    })

    it('should store position in data attribute for element', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 400
        result.current.saveScrollPosition()
      })
      
      expect(mockElement.getAttribute('data-saved-scroll')).toBe('400')
      expect(mockElement.getAttribute('data-saved-scroll-time')).toBeTruthy()
    })
  })

  describe('restoreScrollPosition', () => {
    it('should restore window scroll position', async () => {
      const { result } = renderHook(() => useScrollRestoration())
      const scrollToSpy = vi.spyOn(window, 'scrollTo')
      
      act(() => {
        result.current.setScrollPosition(500)
      })
      
      act(() => {
        result.current.restoreScrollPosition()
      })
      
      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith(0, 500)
      })
    })

    it('should restore element scroll position', async () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 600
        result.current.saveScrollPosition()
      })
      
      mockElement.scrollTop = 0
      
      act(() => {
        result.current.restoreScrollPosition()
      })
      
      await waitFor(() => {
        expect(mockElement.scrollTop).toBe(600)
      })
    })

    it('should not restore if no position was saved', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      const initialScrollTop = mockElement.scrollTop
      
      act(() => {
        result.current.restoreScrollPosition()
      })
      
      expect(mockElement.scrollTop).toBe(initialScrollTop)
    })

    it('should use requestAnimationFrame for restoration', async () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
      
      act(() => {
        result.current.setScrollPosition(700)
        result.current.restoreScrollPosition()
      })
      
      expect(rafSpy).toHaveBeenCalled()
    })
  })

  describe('clearScrollPosition', () => {
    it('should clear saved scroll position', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 800
        result.current.saveScrollPosition()
        result.current.clearScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(0)
      expect(mockElement.getAttribute('data-saved-scroll')).toBeNull()
    })

    it('should remove data attributes from element', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        mockElement.scrollTop = 900
        result.current.saveScrollPosition()
        result.current.clearScrollPosition()
      })
      
      expect(mockElement.getAttribute('data-saved-scroll')).toBeNull()
      expect(mockElement.getAttribute('data-saved-scroll-time')).toBeNull()
    })
  })

  describe('setScrollPosition', () => {
    it('should set window scroll position', () => {
      const { result } = renderHook(() => useScrollRestoration())
      const scrollToSpy = vi.spyOn(window, 'scrollTo')
      
      act(() => {
        result.current.setScrollPosition(1000)
      })
      
      expect(result.current.getScrollPosition()).toBe(1000)
      expect(scrollToSpy).toHaveBeenCalledWith(0, 1000)
    })

    it('should set element scroll position', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: mockElement
      }))
      
      act(() => {
        result.current.setScrollPosition(1100)
      })
      
      expect(mockElement.scrollTop).toBe(1100)
      expect(result.current.getScrollPosition()).toBe(1100)
    })
  })

  describe('autoRestore', () => {
    it('should restore scroll when dependencies change', async () => {
      const { result, rerender } = renderHook(
        ({ deps }) => useScrollRestoration({
          container: mockElement,
          autoRestore: true,
          restoreDependencies: deps
        }),
        {
          initialProps: { deps: [1] }
        }
      )
      
      act(() => {
        mockElement.scrollTop = 1200
        result.current.saveScrollPosition()
      })
      
      mockElement.scrollTop = 0
      
      rerender({ deps: [2] })
      
      await waitFor(() => {
        expect(mockElement.scrollTop).toBe(1200)
      }, { timeout: 1000 })
    })

    it('should not restore if autoRestore is false', async () => {
      const { result, rerender } = renderHook(
        ({ deps }) => useScrollRestoration({
          container: mockElement,
          autoRestore: false,
          restoreDependencies: deps
        }),
        {
          initialProps: { deps: [1] }
        }
      )
      
      act(() => {
        mockElement.scrollTop = 1300
        result.current.saveScrollPosition()
      })
      
      mockElement.scrollTop = 0
      
      rerender({ deps: [2] })
      
      // Wait a bit to ensure restoration doesn't happen
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockElement.scrollTop).toBe(0)
    })

    it('should not restore if no position was saved', async () => {
      const { rerender } = renderHook(
        ({ deps }) => useScrollRestoration({
          container: mockElement,
          autoRestore: true,
          restoreDependencies: deps
        }),
        {
          initialProps: { deps: [1] }
        }
      )
      
      rerender({ deps: [2] })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockElement.scrollTop).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle null container gracefully', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: null
      }))
      
      // Should fall back to window
      act(() => {
        result.current.setScrollPosition(1400)
      })
      
      expect(result.current.getScrollPosition()).toBe(1400)
    })

    it('should handle non-existent selector gracefully', () => {
      const { result } = renderHook(() => useScrollRestoration({
        container: '[data-nonexistent="true"]'
      }))
      
      // Should fall back to window
      act(() => {
        result.current.setScrollPosition(1500)
      })
      
      expect(result.current.getScrollPosition()).toBe(1500)
    })

    it('should handle container change', () => {
      const element1 = document.createElement('div')
      const element2 = document.createElement('div')
      element1.style.height = '1000px'
      element2.style.height = '1000px'
      document.body.appendChild(element1)
      document.body.appendChild(element2)
      
      const { result, rerender } = renderHook(
        ({ container }) => useScrollRestoration({ container }),
        {
          initialProps: { container: element1 }
        }
      )
      
      act(() => {
        element1.scrollTop = 1600
        result.current.saveScrollPosition()
      })
      
      rerender({ container: element2 })
      
      act(() => {
        element2.scrollTop = 1700
        result.current.saveScrollPosition()
      })
      
      expect(result.current.getScrollPosition()).toBe(1700)
      
      document.body.removeChild(element1)
      document.body.removeChild(element2)
    })
  })
})

