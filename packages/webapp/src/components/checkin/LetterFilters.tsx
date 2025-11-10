/**
 * Letter filter component for filtering players by first letter of name.
 * 
 * Displays two rows of letter buttons for filtering players alphabetically.
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
      'rounded-full px-3 py-1 text-sm transition-all duration-200',
      'ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
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
 * Displays two rows of letter buttons for filtering players.
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
  const row1 = [LETTER_FILTERS.ALL, ...allLettersArray.slice(0, LETTER_FILTERS.ROW_SPLIT_INDEX)]
  const row2 = allLettersArray.slice(LETTER_FILTERS.ROW_SPLIT_INDEX)
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        {row1.map((letter) => (
          <LetterButton
            key={letter}
            letter={letter}
            isSelected={selectedLetter === letter}
            onClick={() => onLetterSelect(letter)}
          />
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {row2.map((letter) => (
          <LetterButton
            key={letter}
            letter={letter}
            isSelected={selectedLetter === letter}
            onClick={() => onLetterSelect(letter)}
          />
        ))}
      </div>
    </div>
  )
}

