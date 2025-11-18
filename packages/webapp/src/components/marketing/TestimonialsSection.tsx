import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { PageCard } from '../ui'
import { Quote } from 'lucide-react'

interface Testimonial {
  quote: string
  author: string
  role: string
  club?: string
}

// Empty for now, ready for content
const testimonials: Testimonial[] = []

/**
 * Testimonials section component for marketing landing page.
 * Displays customer testimonials in a carousel format.
 */
export const TestimonialsSection: React.FC = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  // Don't render if no testimonials
  if (testimonials.length === 0) {
    return null
  }

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
            Hvad siger vores kunder?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PageCard hover className="h-full">
                <Quote className="w-8 h-8 text-[hsl(var(--primary))] mb-4" />
                <p className="text-[hsl(var(--foreground))] mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))]">{testimonial.author}</p>
                  <p className="text-sm text-[hsl(var(--muted))]">{testimonial.role}</p>
                  {testimonial.club && (
                    <p className="text-sm text-[hsl(var(--muted))]">{testimonial.club}</p>
                  )}
                </div>
              </PageCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

