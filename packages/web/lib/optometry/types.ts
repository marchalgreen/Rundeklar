import { z } from 'zod';
import { RX_COLUMNS } from './constants';

export type Eye = 'OD' | 'OS';
export type RxField = (typeof RX_COLUMNS)[number];
export type RxRow = Record<RxField, string>;
export type RxTable = Record<Eye, RxRow>;

export const RxRowSchema = z.object({
  sph: z.string().optional().default(''),
  cyl: z.string().optional().default(''),
  axe: z.string().optional().default(''),
  prism: z.string().optional().default(''),
  base: z.string().optional().default(''),
  add: z.string().optional().default(''),
  va: z.string().optional().default(''),
});

export const RxTableSchema = z.object({
  OD: RxRowSchema,
  OS: RxRowSchema,
});

export const OldRxExtrasSchema = z.object({
  vaURx: z.string().optional().default(''),
  pdFar: z.string().optional().default(''),
  pdNear: z.string().optional().default(''),
  bin: z.boolean().optional().default(false),

  // ⬇️ IMPORTANT: default must match the object shape (not {})
  habFar: z
    .object({
      OD: z.string().optional().default(''),
      OS: z.string().optional().default(''),
    })
    .optional()
    .default(() => ({ OD: '', OS: '' })),

  habNear: z
    .object({
      OD: z.string().optional().default(''),
      OS: z.string().optional().default(''),
    })
    .optional()
    .default(() => ({ OD: '', OS: '' })),

  vaBinFar: z.string().optional().default(''),
  vaBinNear: z.string().optional().default(''),
});
