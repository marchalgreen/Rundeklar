import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageCard } from '../../ui'
import { InitialsAvatar } from '../../ui/PlayerAvatar'
import { Button } from '../../ui'
import { formatPlayerCardName } from '../../../lib/formatting'
import type { Player } from '@rundeklar/common'

// Mock players data
const mockPlayers: Player[] = [
  { id: '1', name: 'Anders Hansen', alias: null, active: true, gender: 'Herre', primaryCategory: 'Double', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '2', name: 'Maria Nielsen', alias: null, active: true, gender: 'Dame', primaryCategory: 'Single', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '3', name: 'Lars Pedersen', alias: 'LP', active: true, gender: 'Herre', primaryCategory: 'Begge', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '4', name: 'Sofia Andersen', alias: null, active: true, gender: 'Dame', primaryCategory: 'Double', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '5', name: 'Mikkel Christensen', alias: null, active: true, gender: 'Herre', primaryCategory: 'Single', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '6', name: 'Emma Larsen', alias: null, active: true, gender: 'Dame', primaryCategory: 'Begge', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '7', name: 'Jonas Madsen', alias: null, active: true, gender: 'Herre', primaryCategory: 'Double', createdAt: new Date().toISOString(), trainingGroups: ['A'] },
  { id: '8', name: 'Anna Jensen', alias: null, active: true, gender: 'Dame', primaryCategory: 'Single', createdAt: new Date().toISOString(), trainingGroups: ['A'] }
]

interface CheckInDemoProps {
  checkedInPlayers: Player[]
  onCheckedInChange: (players: Player[]) => void
}

/**
 * Simplified check-in demo component for marketing page.
 * Shows interactive check-in flow with mock data.
 * Shares checked-in players state with parent component.
 */
export const CheckInDemo: React.FC<CheckInDemoProps> = ({ checkedInPlayers, onCheckedInChange }) => {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(mockPlayers)
  const [searchTerm, setSearchTerm] = useState('')
  const [justCheckedIn, setJustCheckedIn] = useState<Set<string>>(new Set())

  const handleCheckIn = (player: Player) => {
    setJustCheckedIn(new Set([player.id]))
    setTimeout(() => {
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id))
      onCheckedInChange([...checkedInPlayers, player])
      setJustCheckedIn(new Set())
    }, 300)
  }

  const handleCheckOut = (player: Player) => {
    onCheckedInChange(checkedInPlayers.filter(p => p.id !== player.id))
    setAvailablePlayers(prev => [...prev, player])
  }

  const filteredPlayers = availablePlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.alias?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort checked-in players alphabetically by first name (like the real product)
  const sortedCheckedInPlayers = useMemo(() => {
    return [...checkedInPlayers].sort((a, b) => {
      const firstNameA = a.name.split(' ')[0] || ''
      const firstNameB = b.name.split(' ')[0] || ''
      return firstNameA.localeCompare(firstNameB, 'da')
    })
  }, [checkedInPlayers])

  return (
    <div className="overflow-x-hidden">
      {/* Search */}
      <div className="relative mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Søg efter spiller..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.2)] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
      </div>

      {/* Two column layout on larger screens */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[35%_65%] lg:items-start">
        {/* Checked In Players - Left Column (always rendered to maintain column order) */}
        <div className="overflow-x-hidden">
          <header className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-[hsl(var(--muted))] uppercase tracking-wide">
              Tjekket ind
            </h3>
            <span className="rounded-full bg-[hsl(var(--surface-2)/.7)] backdrop-blur-sm px-2 py-0.5 text-xs font-medium flex-shrink-0">
              {sortedCheckedInPlayers.length}
            </span>
          </header>
          {checkedInPlayers.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted))] text-center py-4">Ingen spillere tjekket ind endnu.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin">
              <AnimatePresence>
                {sortedCheckedInPlayers.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-x-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-md px-2 py-1.5 sm:py-2 min-h-[56px] sm:min-h-[64px] bg-[hsl(var(--success)/.2)] backdrop-blur-sm shadow-sm ring-1 ring-[hsl(var(--success)/.3)]">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <InitialsAvatar seed={player.id} name={player.name} gender={player.gender ?? null} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[hsl(var(--foreground))] truncate text-sm sm:text-base">
                            {formatPlayerCardName(player.name, player.alias)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleCheckOut(player)} className="flex-shrink-0">
                        Tjek ud
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Available Players - Right Column */}
        <div className="overflow-x-hidden">
          <h3 className="text-sm font-semibold text-[hsl(var(--muted))] mb-3 uppercase tracking-wide">
            Tilgængelige spillere ({filteredPlayers.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin">
            <AnimatePresence>
              {filteredPlayers.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-x-hidden"
                >
                  <PageCard
                    className={`cursor-pointer transition-all relative bg-[hsl(var(--surface))] ${
                      justCheckedIn.has(player.id) ? 'ring-2 ring-[hsl(var(--primary))]' : ''
                    }`}
                    onClick={() => handleCheckIn(player)}
                    style={{
                      transform: justCheckedIn.has(player.id) ? 'scale(1.02)' : 'scale(1)',
                      transformOrigin: 'center'
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <InitialsAvatar seed={player.id} name={player.name} gender={player.gender ?? null} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[hsl(var(--foreground))] truncate">
                            {formatPlayerCardName(player.name, player.alias)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="primary">
                        Tjek ind
                      </Button>
                    </div>
                  </PageCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

