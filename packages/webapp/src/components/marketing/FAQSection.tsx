import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { PageCard } from '../ui'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'Hvordan starter jeg?',
    answer: 'Du kan starte med at prøve vores gratis demo på demo.rundeklar.dk. Her kan du udforske alle funktioner uden at oprette en konto. Når du er klar, kan du kontakte os for at oprette din klub.'
  },
  {
    question: 'Kan jeg prøve produktet før jeg køber?',
    answer: 'Ja! Vi tilbyder en gratis demo på demo.rundeklar.dk hvor du kan udforske alle funktioner. Du kan også kontakte os for en personlig demo eller gratis prøveperiode.'
  },
  {
    question: 'Hvad sker der med mine data?',
    answer: 'Dine data er sikre og private. Vi følger GDPR-reglerne og bruger moderne kryptering til at beskytte dine oplysninger. Du kan altid eksportere eller slette dine data.'
  },
  {
    question: 'Kan jeg ændre pakke senere?',
    answer: 'Ja, du kan opgradere eller nedgradere din pakke når som helst. Ændringer træder i kraft ved næste faktureringsperiode.'
  },
  {
    question: 'Hvad hvis jeg har brug for hjælp?',
    answer: 'Vi tilbyder email support til alle kunder. Professionel og Enterprise kunder får prioriteret support. Du kan også kontakte os direkte hvis du har spørgsmål.'
  },
  {
    question: 'Understøtter I flere klubber?',
    answer: 'Ja, Enterprise pakken understøtter flere klubber og white-label branding. Kontakt os for at høre mere om mulighederne.'
  }
]

/**
 * FAQ accordion item component.
 */
const FAQItem: React.FC<{ faq: FAQItem; index: number }> = ({ faq, index }) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <PageCard hover className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] flex-1 text-left">
            {faq.question}
          </h3>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-[hsl(var(--muted))]" />
          </motion.div>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <p className="text-[hsl(var(--muted))] mt-4 leading-relaxed">
                {faq.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </PageCard>
    </motion.div>
  )
}

/**
 * FAQ section component for marketing landing page.
 * Displays frequently asked questions in an accordion format.
 */
export const FAQSection: React.FC = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} id="faq" className="py-20 sm:py-24 lg:py-32 bg-[hsl(var(--bg-canvas))]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[hsl(var(--foreground))] mb-4 sm:mb-6">
            Ofte stillede spørgsmål
          </h2>
          <p className="text-lg sm:text-xl text-[hsl(var(--muted))] max-w-2xl mx-auto">
            Har du spørgsmål? Vi har svarene
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

