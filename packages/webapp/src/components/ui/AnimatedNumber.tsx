import React, { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  className?: string
}

/**
 * Ease-out cubic easing function for smooth animations.
 */
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * AnimatedNumber component — animates number changes smoothly.
 * 
 * Uses requestAnimationFrame for smooth animations with ease-out cubic easing.
 * Duration defaults to 1500ms as per design guidelines.
 * 
 * @remarks Respects prefers-reduced-motion for accessibility.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1500,
  decimals = 0,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const animationRef = useRef<number | null>(null)
  const startValueRef = useRef(value)
  const startTimeRef = useRef<number | null>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    // If reduced motion is preferred, skip animation
    if (prefersReducedMotion.current) {
      setDisplayValue(value)
      return
    }

    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    const startValue = startValueRef.current
    const endValue = value
    const difference = endValue - startValue

    // If no change, don't animate
    if (difference === 0) {
      return
    }

    startTimeRef.current = null

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)

      const currentValue = startValue + difference * eased
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Ensure final value is exact
        setDisplayValue(endValue)
        startValueRef.current = endValue
        animationRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  // Update start value when value changes (for next animation)
  useEffect(() => {
    startValueRef.current = displayValue
  }, [displayValue])

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString('da-DK')

  return <span className={className}>{formattedValue}</span>
}

