import React from 'react'
import { motion } from 'framer-motion'
import { PageCard } from '../ui'
import { UserCheck, Grid2x2, Users, BarChart3, Zap, Shield } from 'lucide-react'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <UserCheck className="w-8 h-8 sm:w-10 sm:h-10" />,
    title: 'Hurtig Tjek ind',
    description: 'Simpelt og hurtigt tjek ind-system med søgning og virtuel liste. Spillere tjekker ind på sekunder.'
  },
  {
    icon: <Grid2x2 className="w-8 h-8 sm:w-10 sm:h-10" />,
    title: 'Drag & Drop Matchmaking',
    description: 'Træk spillere mellem bænk og baner med intuitiv drag-and-drop. Automatisk matchmaking på alle baner.'
  },
  {
    icon: <Users className="w-8 h-8 sm:w-10 sm:h-10" />,
    title: 'Spilleradministration',
    description: 'Komplet spillerdatabase med søgning, kategorier, niveauer og træningsgrupper. Alt på ét sted.'
  },
  {
    icon: <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10" />,
    title: 'Avancerede Statistikker',
    description: 'Følg spilleres aktivitet, partnere, modstandere og præstationer over tid med detaljerede rapporter.'
  },
  {
    icon: <Zap className="w-8 h-8 sm:w-10 sm:h-10" />,
    title: 'Hurtig & Effektiv',
    description: 'Optimeret til hurtig indlæsning og responsivt design. Fungerer perfekt på alle enheder.'
  },
  {
    icon: <Shield className="w-8 h-8 sm:w-10 sm:h-10" />,
    title: 'Sikker & Privat',
    description: 'Dine data er sikre med moderne kryptering og GDPR-kompatibel databehandling.'
  }
]

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <PageCard hover className="h-full">
        <div className="flex flex-col items-start gap-4">
          <div className="text-[hsl(var(--primary))]">
            {feature.icon}
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">
            {feature.title}
          </h3>
          <p className="text-[hsl(var(--muted))] text-sm sm:text-base leading-relaxed">
            {feature.description}
          </p>
        </div>
      </PageCard>
    </motion.div>
  )
}

/**
 * Features section component for marketing landing page.
 * Displays key features in a grid layout with animations.
 */
export const FeaturesSection: React.FC = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" ref={ref} className="py-20 sm:py-24 lg:py-32 bg-[hsl(var(--bg-canvas))]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12 sm:mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[hsl(var(--foreground))] mb-4 sm:mb-6">
            Alt hvad din klub har brug for
          </h2>
          <p className="text-lg sm:text-xl text-[hsl(var(--muted))] max-w-2xl mx-auto">
            Et komplet system til træningsadministration, matchmaking og statistikker
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

