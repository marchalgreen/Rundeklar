// src/lib/mock/customers.ts
// Mock dataset + helpers for Kundekort search / form.
// Core identity enrichment fields added for Kundekort v2 UI.

export type CustomerId = string;

export type Customer = {
  id: CustomerId;
  firstName: string;
  lastName: string;
  gender?: 'Mand' | 'Kvinde' | 'Andet';
  birthdate?: string; // ISO (yyyy-mm-dd)
  email?: string;
  phoneMobile?: string;
  phoneWork?: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
    country?: string;
  };
  tags?: string[];
  notes?: string;
  customerNo?: number;
  lastActivity?: string; // ISO
  balanceDKK?: number;

  // ── Core identity enrichment ──
  cprMasked?: string; // masked CPR like “181193-xxxx” (safe for display)
  cprFull?: string; // full CPR like “181193-1234” (for reveal-on-click)
  createdAt?: string; // record creation date
  updatedAt?: string; // last data change
  marketingConsent?: boolean; // accepted marketing?
  preferredChannel?: 'sms' | 'email' | 'phone';
  language?: 'da' | 'en';
  occupation?: string;
};

// ---------------- helpers: CPR generation ----------------

function toDDMMYY(iso?: string): string | null {
  if (!iso) return null;
  // allow yyyy-mm-dd or any Date-parsable string
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function hashSeed(s: string): number {
  // simple 32-bit hash (deterministic across runs)
  let h = 2166136261 >>> 0; // FNV-ish
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function last4ForGender(seedStr: string, gender?: Customer['gender']): string {
  // Make a 4-digit serial, ensure last digit parity:
  //  - Mand  => last digit odd
  //  - Kvinde => last digit even
  //  - Andet/undefined => leave as-is
  const base = hashSeed(seedStr) % 10000; // 0..9999
  let n = base;
  // avoid too tiny numbers for realism
  if (n < 1000) n += 1000; // 1000..9999

  const wantOdd = gender === 'Mand';
  const wantEven = gender === 'Kvinde';

  const last = n % 10;
  if (wantOdd && last % 2 === 0) n = (n + 1) % 10000;
  if (wantEven && last % 2 !== 0) n = (n + 1) % 10000;
  if (n < 1000) n += 1000; // re-guard after modulo

  return String(n).padStart(4, '0');
}

function buildCpr(
  birthdate?: string,
  gender?: Customer['gender'],
  seed?: string
): { masked?: string; full?: string } {
  const ddmmyy = toDDMMYY(birthdate);
  if (!ddmmyy) return {};
  const last4 = last4ForGender(seed ?? ddmmyy, gender);
  return {
    masked: `${ddmmyy}-xxxx`,
    full: `${ddmmyy}-${last4}`,
  };
}

// helper for common defaults
const enrich = (base: Partial<Customer>): Partial<Customer> => ({
  marketingConsent: true,
  preferredChannel: 'sms',
  language: 'da',
  createdAt: '2023-04-01',
  updatedAt: '2025-09-25',
  ...base,
});

// ---------------- raw seed data (without cprFull) ----------------

const RAW: Customer[] = [
  {
    id: 'cst_0061',
    firstName: 'Mikkel',
    lastName: 'Andersen',
    gender: 'Mand',
    birthdate: '1991-06-11',
    email: 'mikkel.andersen@example.dk',
    phoneMobile: '11 61 61 61',
    address: {
      street: 'Andersensvej 61',
      postalCode: '8000',
      city: 'Aarhus C',
      country: 'Danmark',
    },
    customerNo: 499,
    lastActivity: '2025-09-22',
    balanceDKK: 0,
    occupation: 'IT-konsulent',
    cprMasked: '110691-xxxx',
    ...enrich({}),
  },
  {
    id: 'cst_0062',
    firstName: 'Sofie',
    lastName: 'Jensen',
    gender: 'Kvinde',
    birthdate: '1994-03-05',
    email: 'sofie.jensen@example.dk',
    phoneMobile: '22 62 62 62',
    address: {
      street: 'Jensensvej 62',
      postalCode: '2100',
      city: 'København Ø',
      country: 'Danmark',
    },
    customerNo: 500,
    lastActivity: '2025-08-30',
    balanceDKK: 89,
    occupation: 'Sygeplejerske',
    cprMasked: '050394-xxxx',
    ...enrich({ preferredChannel: 'email' }),
  },
  {
    id: 'cst_0063',
    firstName: 'Oliver',
    lastName: 'Pedersen',
    gender: 'Mand',
    birthdate: '1990-12-19',
    email: 'oliver.pedersen@example.dk',
    phoneMobile: '33 63 63 63',
    address: {
      street: 'Pedersensvej 63',
      postalCode: '5000',
      city: 'Odense C',
      country: 'Danmark',
    },
    customerNo: 501,
    lastActivity: '2025-09-12',
    balanceDKK: -120.5,
    occupation: 'Studerende',
    cprMasked: '191290-xxxx',
    ...enrich({ marketingConsent: false }),
  },
  {
    id: 'cst_0064',
    firstName: 'Freja',
    lastName: 'Larsen',
    gender: 'Kvinde',
    birthdate: '1996-02-17',
    email: 'freja.larsen@example.dk',
    phoneMobile: '44 64 64 64',
    address: { street: 'Larsensvej 64', postalCode: '9000', city: 'Aalborg', country: 'Danmark' },
    customerNo: 502,
    lastActivity: '2025-07-05',
    balanceDKK: 0,
    occupation: 'Lærer',
    cprMasked: '170296-xxxx',
    ...enrich({}),
  },
  {
    id: 'cst_0065',
    firstName: 'Lucas',
    lastName: 'Christensen',
    gender: 'Mand',
    birthdate: '1993-09-09',
    email: 'lucas.christensen@example.dk',
    phoneMobile: '55 65 65 65',
    address: {
      street: 'Christensensvej 65',
      postalCode: '4000',
      city: 'Roskilde',
      country: 'Danmark',
    },
    customerNo: 503,
    lastActivity: '2025-09-01',
    balanceDKK: 245.75,
    occupation: 'Økonom',
    cprMasked: '090993-xxxx',
    ...enrich({ preferredChannel: 'phone' }),
  },
  {
    id: 'cst_0066',
    firstName: 'Emma',
    lastName: 'Madsen',
    gender: 'Kvinde',
    birthdate: '1998-09-02',
    email: 'emma.madsen@example.dk',
    phoneMobile: '66 66 66 66',
    address: { street: 'Madsensvej 66', postalCode: '7100', city: 'Vejle', country: 'Danmark' },
    customerNo: 504,
    lastActivity: '2025-09-25',
    balanceDKK: 0,
    occupation: 'Optiker',
    cprMasked: '020998-xxxx',
    ...enrich({}),
  },
  {
    id: 'cst_0067',
    firstName: 'Magnus',
    lastName: 'Olsen',
    gender: 'Mand',
    birthdate: '1989-04-27',
    email: 'magnus.olsen@example.dk',
    phoneMobile: '77 67 67 67',
    address: { street: 'Olsensvej 67', postalCode: '6000', city: 'Kolding', country: 'Danmark' },
    customerNo: 505,
    lastActivity: '2025-06-18',
    balanceDKK: 0,
    occupation: 'Sælger',
    cprMasked: '270489-xxxx',
    ...enrich({}),
  },
  {
    id: 'cst_0068',
    firstName: 'Clara',
    lastName: 'Nielsen',
    gender: 'Kvinde',
    birthdate: '1995-11-14',
    email: 'clara.nielsen@example.dk',
    phoneMobile: '88 68 68 68',
    address: {
      street: 'Nielsensvej 68',
      postalCode: '4400',
      city: 'Kalundborg',
      country: 'Danmark',
    },
    customerNo: 506,
    lastActivity: '2025-05-12',
    balanceDKK: 50,
    occupation: 'Studerende',
    cprMasked: '141195-xxxx',
    ...enrich({ marketingConsent: false }),
  },
  {
    id: 'cst_0069',
    firstName: 'Malthe',
    lastName: 'Thomsen',
    gender: 'Mand',
    birthdate: '1988-01-15',
    email: 'malthe.thomsen@example.dk',
    phoneMobile: '99 69 69 69',
    address: {
      street: 'Thomsensvej 69',
      postalCode: '8600',
      city: 'Silkeborg',
      country: 'Danmark',
    },
    customerNo: 507,
    lastActivity: '2025-08-02',
    balanceDKK: 0,
    occupation: 'Ingeniør',
    cprMasked: '150188-xxxx',
    ...enrich({}),
  },
  {
    id: 'cst_0070',
    firstName: 'Laura',
    lastName: 'Hansen',
    gender: 'Kvinde',
    birthdate: '1997-05-24',
    email: 'laura.hansen@example.dk',
    phoneMobile: '12 70 70 70',
    address: { street: 'Hansensvej 70', postalCode: '9800', city: 'Hjørring', country: 'Danmark' },
    customerNo: 508,
    lastActivity: '2025-04-20',
    occupation: 'Tandplejer',
    cprMasked: '240597-xxxx',
    ...enrich({}),
  },
  {
    id: 'cst_0101',
    firstName: 'Søren',
    lastName: 'Nichlas Frid',
    gender: 'Mand',
    birthdate: '1965-02-06',
    email: 'logiops@me.com',
    phoneMobile: '20 91 88 88',
    address: {
      street: 'Sankt Ibs Vej 8A',
      postalCode: '4000',
      city: 'Roskilde',
      country: 'Danmark',
    },
    occupation: 'Optiker',
    cprMasked: '060265-xxxx',
    marketingConsent: true,
    preferredChannel: 'sms',
    language: 'da',
    createdAt: '2023-03-15',
    updatedAt: '2025-09-28',
    customerNo: 452,
    tags: ['familie', 'special', 'VIP'],
    notes: 'Langvarig kunde. Foretrækker SMS. Har forsikring.',
    lastActivity: '2025-09-28',
    balanceDKK: 0,
  },
];

// ---------------- finalize: add deterministic cprFull + normalize masked ----------------

const C: Customer[] = RAW.map((c) => {
  const base = `${c.id}|${c.email ?? ''}|${c.firstName}${c.lastName}`; // stable seed
  const built = buildCpr(c.birthdate, c.gender, base);
  const ddmmyy = toDDMMYY(c.birthdate);
  const masked = ddmmyy ? `${ddmmyy}-xxxx` : c.cprMasked; // prefer recomputed mask from birthdate
  return {
    ...c,
    cprMasked: masked,
    cprFull: built.full, // e.g., "060265-1234" with correct gender parity
  };
});

export const customers = C;

// Small helpers
export const fullName = (c: Customer) => `${c.firstName} ${c.lastName}`;
export const fullAddress = (c: Customer) =>
  `${c.address.street}, ${c.address.postalCode} ${c.address.city}`;

// Utility to get a customer by id (handy if you need it elsewhere)
export const getCustomerById = (id: string) => customers.find((x) => x.id === id);
