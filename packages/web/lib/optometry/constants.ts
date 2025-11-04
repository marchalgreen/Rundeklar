// src/lib/optometry/constants.ts
export const REASONS = [
  'Stel/glas',
  'Linser',
  'Kontrol',
  'Synsproblemer',
  'Kørsel / kørekort',
  'Arbejde/skærm',
] as const;

export const SYMPTOMS = [
  'Hovedpine',
  'Tørre øjne',
  'Slør på nær',
  'Slør på afstand',
  'Dobbelt syn',
] as const;

export const MEDICAL_HISTORY = [
  'Diabetes',
  'Glaukom i familien',
  'Migræne',
  'Hypertension',
  'Allergi',
  'Katarakt (grå stær)',
] as const;

export const MEDICATIONS = [
  'Blodtrykssænkende',
  'Allergimedicin',
  'Antidepressiv',
  'Øjendråber (kunstige tårer)',
] as const;

export const FAMILY_HISTORY = ['Glaukom', 'AMD', 'Skelen', 'Keratokonus', 'Diabetes'] as const;

export const WORK_SITUATIONS = [
  'Kontor / skærm',
  'Håndværk',
  'Chauffør',
  'Studerende',
  'Pensionist',
  'Butik',
] as const;

// Rx grid columns (single source of truth)
export const RX_COLUMNS = ['sph', 'cyl', 'axe', 'prism', 'base', 'add', 'va'] as const;

// Copy-from sources
export const RX_COPY_SOURCES = [
  'Stel/glas',
  'Linser',
  'Seneste synsprøve',
  'Journalnotat',
] as const;
