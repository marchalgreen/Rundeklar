import { z } from 'zod';

export const DocLink = z.object({
  title: z.string(),
  href: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
});

export type DocLink = z.infer<typeof DocLink>;

export const DocGroup = z.object({
  label: z.string(),
  items: z.array(DocLink),
});

export type DocGroup = z.infer<typeof DocGroup>;

export const DocSection = z.object({
  id: z.string(),
  title: z.string(),
  intro: z.string().optional(),
  groups: z.array(DocGroup),
});

export type DocSection = z.infer<typeof DocSection>;
