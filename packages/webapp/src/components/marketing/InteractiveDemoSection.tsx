import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { PageCard } from '../ui'
import { Button } from '../ui'
import { CheckInDemo } from './demos/CheckInDemo'
import { DragDropDemo } from './demos/DragDropDemo'
import { UserCheck, Grid2x2, ExternalLink } from 'lucide-react'
import type { Player } from '@rundeklar/common'

type DemoType = 'checkin' | 'dragdrop'

/**
 * Interactive demo section component for marketing landing page.
 * Features tabs to switch between different demo types.
 * Shares state between check-in and match program demos.
 */
export const InteractiveDemoSection: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<DemoType>('checkin')
  // Shared state: checked-in players are available in both demos
  const [checkedInPlayers, setCheckedInPlayers] = useState<Player[]>([])
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-20 sm:py-24 lg:py-32 bg-[hsl(var(--bg-gradient-1))]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[hsl(var(--foreground))] mb-4 sm:mb-6">
            Se Rundeklar i aktion
          </h2>
          <p className="text-lg sm:text-xl text-[hsl(var(--muted))] max-w-2xl mx-auto">
            Prøv de vigtigste funktioner direkte her på siden og mærk hvordan det føles at køre en træningsaften med Rundeklar.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg bg-[hsl(var(--surface-2))] p-1 ring-1 ring-[hsl(var(--line)/.12)]">
            <button
              onClick={() => setActiveDemo('checkin')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                activeDemo === 'checkin'
                  ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Tjek ind
              </div>
            </button>
            <button
              onClick={() => setActiveDemo('dragdrop')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                activeDemo === 'dragdrop'
                  ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Grid2x2 className="w-4 h-4" />
                Sæt runden
              </div>
            </button>
          </div>
        </div>

        {/* Demo Content */}
        <motion.div
          key={activeDemo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <PageCard className="max-w-4xl mx-auto overflow-x-hidden">
            {activeDemo === 'checkin' && (
              <CheckInDemo
                checkedInPlayers={checkedInPlayers}
                onCheckedInChange={setCheckedInPlayers}
              />
            )}
            {activeDemo === 'dragdrop' && (
              <DragDropDemo checkedInPlayers={checkedInPlayers} />
            )}
          </PageCard>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-8 sm:mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex flex-col items-center gap-3">
            <Button
              size="md"
              onClick={() => window.open('https://demo.rundeklar.dk', '_blank')}
              className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7"
            >
              Prøv hele produktet på demo.rundeklar.dk
              <ExternalLink className="w-5 h-5" />
            </Button>
            <p className="text-sm text-[hsl(var(--muted))]">
              Test alle funktioner gratis uden login.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

