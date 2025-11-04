import { z } from 'zod';

export const NormalizedUsageSchema = z.enum(['optical', 'sun', 'both']);

export const NormalizedVendorRefSchema = z.object({
  slug: z.string().min(1, 'Vendor slug is required'),
  name: z.string().optional(),
  profileId: z.string().optional(),
});

export const NormalizedPriceSchema = z.object({
  amount: z.number().finite(),
  currency: z.string().min(1).max(8),
});

export const NormalizedSourceSchema = z.object({
  url: z.string().url().optional(),
  retrievedAt: z.string().datetime().optional(),
  priceList: z.string().optional(),
  note: z.string().optional(),
});

export const NormalizedPhotoAngleSchema = z.enum([
  'front',
  'quarter',
  'side',
  'temple',
  'model',
  'detail',
  'pack',
  'clip',
  'unknown',
]);

export const NormalizedPhotoSchema = z.object({
  url: z.string().url(),
  label: z.string().optional(),
  isHero: z.boolean().optional(),
  source: z.enum(['catalog', 'local']).optional(),
  angle: NormalizedPhotoAngleSchema.optional(),
  colorwayName: z.string().optional(),
});

export const NormalizedFrameMeasurementsSchema = z
  .object({
    lensWidth: z.number().optional(),
    lensHeight: z.number().optional(),
    frameWidth: z.number().optional(),
    bridge: z.number().optional(),
    temple: z.number().optional(),
  })
  .refine((value) => Object.values(value).some((v) => typeof v === 'number'), {
    message: 'At least one frame measurement is required when measurements are provided',
  })
  .optional();

export const NormalizedColorSchema = z.object({
  name: z.string().min(1),
  swatch: z.string().optional(),
  finish: z.string().optional(),
});

export const NormalizedVariantBaseSchema = z.object({
  id: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  notes: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const NormalizedFrameVariantSchema = NormalizedVariantBaseSchema.extend({
  type: z.literal('frame'),
  sizeLabel: z.string().optional(),
  measurements: NormalizedFrameMeasurementsSchema,
  fit: z.enum(['narrow', 'average', 'wide', 'extra-wide']).optional(),
  usage: NormalizedUsageSchema.optional(),
  color: NormalizedColorSchema.optional(),
  polarized: z.boolean().optional(),
  clipCompatible: z.boolean().optional(),
});

export const NormalizedLensVariantSchema = NormalizedVariantBaseSchema.extend({
  type: z.literal('lens'),
  index: z.string().optional(),
  coating: z.string().optional(),
  diameter: z.number().optional(),
  baseCurve: z.number().optional(),
});

export const NormalizedContactVariantSchema = NormalizedVariantBaseSchema.extend({
  type: z.literal('contact'),
  power: z.number().optional(),
  cylinder: z.number().optional(),
  axis: z.number().optional(),
  baseCurve: z.number().optional(),
  diameter: z.number().optional(),
  packSize: z.number().optional(),
});

export const NormalizedAccessoryVariantSchema = NormalizedVariantBaseSchema.extend({
  type: z.literal('accessory'),
  color: NormalizedColorSchema.optional(),
  sizeLabel: z.string().optional(),
  packSize: z.number().optional(),
});

export const NormalizedVariantSchema = z.discriminatedUnion('type', [
  NormalizedFrameVariantSchema,
  NormalizedLensVariantSchema,
  NormalizedContactVariantSchema,
  NormalizedAccessoryVariantSchema,
]);

export const NormalizedCategorySchema = z.enum(['Frames', 'Lenses', 'Contacts', 'Accessories']);

export const NormalizedProductSchema = z
  .object({
    vendor: NormalizedVendorRefSchema,
    catalogId: z.string().min(1),
    name: z.string().optional(),
    model: z.string().optional(),
    brand: z.string().optional(),
    category: NormalizedCategorySchema,
    tags: z.array(z.string()).optional(),
    collections: z.array(z.string()).optional(),
    descriptionHtml: z.string().optional(),
    storyHtml: z.string().optional(),
    photos: z.array(NormalizedPhotoSchema).default([]),
    source: NormalizedSourceSchema,
    price: NormalizedPriceSchema.optional(),
    variants: z.array(NormalizedVariantSchema).min(1),
    extras: z.record(z.string(), z.unknown()).optional(),
    raw: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    const expectedVariantType = (
      {
        Frames: 'frame',
        Lenses: 'lens',
        Contacts: 'contact',
        Accessories: 'accessory',
      } as const
    )[value.category];

    const mismatched = value.variants.find((variant) => variant.type !== expectedVariantType);
    if (mismatched) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Variant type ${mismatched.type} does not match product category ${value.category}`,
        path: ['variants'],
      });
    }
  });

export const NormalizedProductArraySchema = z.array(NormalizedProductSchema);
