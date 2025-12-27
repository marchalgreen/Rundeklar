import { useRef, useCallback, useEffect } from 'react'

/**
 * Options for useScrollRestoration hook.
 */
export interface UseScrollRestorationOptions {
  /** Optional container element selector or ref. If not provided, uses window. */
  container?: HTMLElement | string | null
  /** Whether to restore scroll position automatically when dependencies change. */
  autoRestore?: boolean
  /** Dependencies that trigger scroll restoration when changed. */
  restoreDependencies?: unknown[]
}

/**
 * Return type for useScrollRestoration hook.
 */
export interface UseScrollRestorationReturn {
  /** Save current scroll position. */
  saveScrollPosition: () => void
  /** Restore saved scroll position. */
  restoreScrollPosition: () => void
  /** Clear saved scroll position. */
  clearScrollPosition: () => void
  /** Get current scroll position. */
  getScrollPosition: () => number
  /** Set scroll position manually. */
  setScrollPosition: (position: number) => void
}

/**
 * Custom hook for managing scroll position restoration.
 * Useful for preserving scroll position when navigating or updating lists.
 * 
 * @param options - Hook configuration options
 * @returns Scroll restoration functions
 * 
 * @example
 * ```typescript
 * const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration({
 *   container: tableContainerRef.current,
 *   autoRestore: true,
 *   restoreDependencies: [data]
 * })
 * 
 * // Save before navigation
 * saveScrollPosition()
 * navigate('/other-page')
 * 
 * // Restore after navigation
 * restoreScrollPosition()
 * ```
 */
export function useScrollRestoration(
  options: UseScrollRestorationOptions = {}
): UseScrollRestorationReturn {
  const { container, autoRestore = false, restoreDependencies = [] } = options
  
  const scrollPositionRef = useRef<number>(0)
  const shouldRestoreRef = useRef<boolean>(false)
  const containerRef = useRef<HTMLElement | null>(null)

  // Resolve container element
  useEffect(() => {
    if (typeof container === 'string') {
      containerRef.current = document.querySelector(container)
    } else if (container instanceof HTMLElement) {
      containerRef.current = container
    } else {
      containerRef.current = null
    }
  }, [container])

  const getScrollElement = useCallback((): HTMLElement | Window => {
    return containerRef.current ?? window
  }, [])

  const saveScrollPosition = useCallback(() => {
    const element = getScrollElement()
    const scrollTop = element === window 
      ? window.scrollY || window.pageYOffset
      : (element as HTMLElement).scrollTop
    
    if (scrollTop > 0) {
      scrollPositionRef.current = scrollTop
      shouldRestoreRef.current = true
      
      // Store in data attribute for persistence across renders
      if (element !== window && element instanceof HTMLElement) {
        element.setAttribute('data-saved-scroll', scrollTop.toString())
        element.setAttribute('data-saved-scroll-time', Date.now().toString())
      }
    }
  }, [getScrollElement])

  const restoreScrollPosition = useCallback(() => {
    if (!shouldRestoreRef.current || scrollPositionRef.current <= 0) {
      return
    }

    const element = getScrollElement()
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (element === window) {
        window.scrollTo(0, scrollPositionRef.current)
      } else if (element instanceof HTMLElement) {
        element.scrollTop = scrollPositionRef.current
      }
      
      shouldRestoreRef.current = false
    })
  }, [getScrollElement])

  const clearScrollPosition = useCallback(() => {
    scrollPositionRef.current = 0
    shouldRestoreRef.current = false
    
    const element = getScrollElement()
    if (element !== window && element instanceof HTMLElement) {
      element.removeAttribute('data-saved-scroll')
      element.removeAttribute('data-saved-scroll-time')
    }
  }, [getScrollElement])

  const getScrollPosition = useCallback((): number => {
    return scrollPositionRef.current
  }, [])

  const setScrollPosition = useCallback((position: number) => {
    scrollPositionRef.current = position
    shouldRestoreRef.current = true
    
    const element = getScrollElement()
    if (element === window) {
      window.scrollTo(0, position)
    } else if (element instanceof HTMLElement) {
      element.scrollTop = position
    }
  }, [getScrollElement])

  // Auto-restore when dependencies change
  useEffect(() => {
    if (autoRestore && shouldRestoreRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        restoreScrollPosition()
      }, 0)
      
      return () => clearTimeout(timeoutId)
    }
  }, [autoRestore, restoreScrollPosition, ...restoreDependencies])

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
    getScrollPosition,
    setScrollPosition
  }
}

