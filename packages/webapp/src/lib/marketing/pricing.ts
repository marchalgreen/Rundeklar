/**
 * Pricing plans configuration for marketing page.
 */

export interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number // monthlyPrice * 12 * 0.9
  features: string[]
  limitations?: string[]
  ctaText: string
  featured?: boolean
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basispakke',
    description: 'Perfekt til små klubber og enkeltstående træningsgrupper',
    monthlyPrice: 250,
    yearlyPrice: 2700, // 250 * 12 * 0.9
    features: [
      '1 træningsgruppe',
      '1 træner',
      'Spilleradministration',
      'Check-in system',
      'Kampprogram med drag & drop',
      'Statistikker',
      'Email support'
    ],
    limitations: [
      '1 træningsgruppe',
      '1 træner'
    ],
    ctaText: 'Start gratis prøveperiode',
    featured: false
  },
  {
    id: 'professional',
    name: 'Professionel',
    description: 'For klubber der skal håndtere flere træningsgrupper og trænere',
    monthlyPrice: 400,
    yearlyPrice: 4320, // 400 * 12 * 0.9
    features: [
      'Ubegrænsede træningsgrupper',
      'Ubegrænsede trænere/logins',
      'Egen administrator',
      'Spilleradministration',
      'Check-in system',
      'Kampprogram med drag & drop',
      'Avancerede statistikker',
      'Prioriteret support'
    ],
    limitations: [],
    ctaText: 'Start gratis prøveperiode',
    featured: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Tilpasset løsning for større organisationer med specifikke behov',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Alt fra Professionel',
      'White-label branding',
      'Custom features',
      'Dedikeret support',
      'Onboarding assistance',
      'API adgang',
      'Custom integrationer'
    ],
    limitations: [],
    ctaText: 'Kontakt os',
    featured: false
  }
]

