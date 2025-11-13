/**
 * Letter filter component for filtering players by first letter of name.
 * 
 * Displays letter buttons that wrap responsively based on screen size.
 */

import React from 'react'
import { clsx } from 'clsx'
import { LETTER_FILTERS } from '../../constants'

/**
 * Props for LetterFilters component.
 */
interface LetterFiltersProps {
  /** Currently selected letter filter. */
  selectedLetter: string
  
  /** Callback when a letter is selected. */
  onLetterSelect: (letter: string) => void
}

/**
 * Letter filter button component.
 */
const LetterButton: React.FC<{
  letter: string
  isSelected: boolean
  onClick: () => void
}> = ({ letter, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm transition-all duration-200',
      'ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
      'min-w-[32px] sm:min-w-[36px] flex items-center justify-center',
      isSelected
        ? 'bg-accent text-white shadow-[0_2px_8px_hsl(var(--line)/.12)]'
        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:text-foreground border-hair'
    )}
  >
    {letter}
  </button>
)

/**
 * Letter filters component.
 * 
 * Displays letter buttons for filtering players alphabetically.
 * Responsive layout: single row on mobile, organized rows on larger screens.
 * 
 * @example
 * ```tsx
 * <LetterFilters
 *   selectedLetter="A"
 *   onLetterSelect={setFilterLetter}
 * />
 * ```
 */
export const LetterFilters: React.FC<LetterFiltersProps> = ({
  selectedLetter,
  onLetterSelect
}) => {
  const allLettersArray = Array.from(LETTER_FILTERS.ALL_LETTERS)
  const allLetters = [LETTER_FILTERS.ALL, ...allLettersArray]
  
  // Single flex-wrap container that wraps naturally
  // Smaller buttons and tighter gaps on mobile prevent excessive rows
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {allLetters.map((letter) => (
        <LetterButton
          key={letter}
          letter={letter}
          isSelected={selectedLetter === letter}
          onClick={() => onLetterSelect(letter)}
        />
      ))}
    </div>
  )
}

