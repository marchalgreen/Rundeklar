import React, { useRef } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../ui'

const ringFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]'

export type CrossGroupResult = { id: string; displayName: string; groupId: string | null }

type Props = {
  open: boolean
  onClose: () => void
  term: string
  setTerm: (v: string) => void
  results: CrossGroupResult[]
  onPick: (id: string) => void
  pickedIds: Set<string>
  returnFocusTo?: HTMLElement | null
}

const CrossGroupSearchModal: React.FC<Props> = ({ open, onClose, term, setTerm, results, onPick, pickedIds, returnFocusTo }) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Søg spillere på tværs"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
          setTimeout(() => returnFocusTo?.focus(), 0)
        }
        if (e.key === 'Tab') {
          const container = e.currentTarget as HTMLElement
          const focusables = container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])')
          if (!focusables.length) return
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus()
          }
        }
      }}
    >
      <div className="w-full max-w-lg mx-3 sm:mx-0 bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] rounded-lg shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3 p-4 border-b border-[hsl(var(--line)/.12)]">
          <Search className="w-5 h-5 text-[hsl(var(--muted))]" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Søg spillere på tværs af grupper"
            className={`flex-1 bg-transparent outline-none text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted))] ${ringFocus}`}
          />
          <Button variant="ghost" size="sm" onClick={() => { onClose(); setTimeout(() => returnFocusTo?.focus(), 0) }}>Luk</Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 scrollbar-thin">
          {results.length === 0 ? (
            <div className="text-sm text-[hsl(var(--muted))] p-4">Ingen resultater endnu.</div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--line)/.12)]">
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-[hsl(var(--foreground))] truncate">{p.displayName}</div>
                    <div className="text-xs text-[hsl(var(--muted))]">{p.groupId ?? 'Ingen gruppe'}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={pickedIds.has(p.id) ? 'secondary' : 'primary'}
                    onClick={() => onPick(p.id)}
                    aria-label={`Tillad ${p.displayName} i denne træning`}
                    disabled={pickedIds.has(p.id)}
                  >
                    Tillad
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default CrossGroupSearchModal


