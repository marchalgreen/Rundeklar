import { z } from 'zod';

export const CustomerSchema = z.object({
  id: z.string(),
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  gender: z.enum(['Mand', 'Kvinde', 'Andet']).optional(),
  birthdate: z.string().date().or(z.string().length(10)).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phoneMobile: z.string().optional().or(z.literal('')),
  phoneWork: z.string().optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional().default(''),
    postalCode: z.string().optional().default(''),
    city: z.string().optional().default(''),
    country: z.string().optional().default('Danmark'),
  }),
  cprMasked: z.string().optional(),
  cprFull: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
  customerNo: z.number().optional(),
  lastActivity: z.string().optional(),
  balanceDKK: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  marketingConsent: z.boolean().optional(),
  preferredChannel: z.enum(['sms', 'email', 'phone']).optional(),
  language: z.enum(['da', 'en']).optional(),
});

export type CustomerDraft = z.infer<typeof CustomerSchema>;
