import { z } from 'zod';

export const vendorSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug er påkrævet')
  .max(48, 'Slug må højst være 48 tegn')
  .regex(/^[a-z0-9-]+$/, 'Slug må kun indeholde små bogstaver, tal og bindestreger');

export const vendorNameSchema = z
  .string()
  .trim()
  .min(1, 'Navn er påkrævet')
  .max(120, 'Navn må højst være 120 tegn');

export const vendorIntegrationTypeSchema = z.enum(['SCRAPER', 'API']);

const credentialShape = {
  scraperPath: z
    .string()
    .trim()
    .min(1, 'Angiv sti til scraper-scriptet')
    .optional(),
  apiBaseUrl: z
    .string()
    .trim()
    .url('Angiv en gyldig API base URL')
    .optional(),
  apiKey: z
    .string()
    .trim()
    .min(1, 'API nøgle er påkrævet')
    .optional(),
};

export const vendorCredentialsSchema = z
  .object(credentialShape)
  .partial()
  .default({});

export const vendorCreatePayloadSchema = z
  .object({
    slug: vendorSlugSchema,
    name: vendorNameSchema,
    integrationType: vendorIntegrationTypeSchema,
    credentials: vendorCredentialsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.integrationType === 'SCRAPER') {
      const path = value.credentials?.scraperPath?.trim();
      if (!path) {
        ctx.addIssue({
          path: ['credentials', 'scraperPath'],
          code: z.ZodIssueCode.custom,
          message: 'Scraper sti er påkrævet for scraper-integrationer',
        });
      }
    }

    if (value.integrationType === 'API') {
      const baseUrl = value.credentials?.apiBaseUrl?.trim();
      const apiKey = value.credentials?.apiKey?.trim();
      if (!baseUrl) {
        ctx.addIssue({
          path: ['credentials', 'apiBaseUrl'],
          code: z.ZodIssueCode.custom,
          message: 'API base URL er påkrævet for API-integrationer',
        });
      }
      if (!apiKey) {
        ctx.addIssue({
          path: ['credentials', 'apiKey'],
          code: z.ZodIssueCode.custom,
          message: 'API nøgle er påkrævet for API-integrationer',
        });
      }
    }
  });

export type VendorCreatePayload = z.infer<typeof vendorCreatePayloadSchema>;
export type VendorCredentialPayload = z.infer<typeof vendorCredentialsSchema>;
