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
    description: 'Til mindre klubber og enkelte træningsgrupper.',
    monthlyPrice: 250,
    yearlyPrice: 2700, // 250 * 12 * 0.9
    features: [
      '1 træningsgruppe',
      '1 trænerlogin',
      'Tjek ind system',
      'Kampprogram med drag og drop',
      'Spilleradministration',
      'Simple fremmødestatistikker',
      'Email support'
    ],
    limitations: [],
    ctaText: 'Start gratis prøveperiode',
    featured: false
  },
  {
    id: 'professional',
    name: 'Professionel',
    description: 'Til klubber der håndterer flere træningsgrupper og trænere.',
    monthlyPrice: 400,
    yearlyPrice: 4320, // 400 * 12 * 0.9
    features: [
      'Ubegrænsede træningsgrupper',
      'Ubegrænsede trænerlogins',
      'Egen administrator',
      'Udvidet spilleradministration',
      'Tjek ind system',
      'Kampprogram med drag og drop på alle baner',
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
    description: 'Til forbund, større klubber og organisationer med særlige behov.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Alt fra Professionel',
      'White label branding',
      'Custom funktioner og rapporter',
      'Dedikeret onboarding og support',
      'API adgang',
      'Custom integrationer'
    ],
    limitations: [],
    ctaText: 'Kontakt os',
    featured: false
  }
]

