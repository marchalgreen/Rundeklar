// src/lib/ocr/address.ts
// Robust Danish address helpers (pure functions, safe for server or client).

export type ParsedSkeleton = {
  streetRaw: string;
  postnr: string;
  cityRaw: string;
};

export type CanonicalAddress = {
  street: string; // e.g., "Ben Websters Vej 15"
  postalCode: string; // e.g., "2450"
  city: string; // e.g., "København SV"
  country?: string; // default "Danmark"
  dawaId?: string; // Dataforsyningen address id
  raw?: string; // optional source string
};

export const STREET_TYPES = [
  'vej',
  'gade',
  'boulevard',
  'allé',
  'alle',
  'plads',
  'stræde',
  'torv',
  'park',
  'bakke',
  'engen',
  'sti',
];

export const CITY_SYNONYMS: Record<string, string> = {
  kbh: 'københavn',
  'københavn k': 'københavn k',
  'københavn v': 'københavn v',
  'københavn n': 'københavn n',
  'københavn ø': 'københavn ø',
  'københavn s': 'københavn s',
  'københavn sv': 'københavn sv',
  'københavn nv': 'københavn nv',
};

export function normalizeOcr(str: string) {
  return str
    .replace(/[|]/g, 'l') // pipe → l
    .replace(/(?<=\d)[iI]/g, '1')
    .replace(/[iI](?=\d)/g, '1')
    .replace(/\bSY\b/gi, 'SV') // København SY → SV
    .replace(/\b0(?=[A-Za-z])/g, 'O')
    .replace(/(?<=\s)[Oo](?=\d)/g, '0')
    .replace(/\u00A0/g, ' ')
    .replace(/[·••]/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function stripUnitNoise(street: string) {
  // Remove trailing floor/door info (st., kl., mf., 1. tv, 2. th, kld, etc.)
  return street
    .replace(/\b(?:st|kl|mf|tv|th|kld|mfl|[0-9]{1,2}\.?\s*(?:tv|th|mf))\b.*$/i, '')
    .trim();
}

export function parseSkeleton(text: string): ParsedSkeleton | null {
  const t = normalizeOcr(text);
  const m =
    t.match(
      /([A-Za-zÀ-ÿÆØÅæøå.\- ]{3,}?\s+\d+[A-Za-z]?)\s*[, ]+\s*(\d{4})\s+([A-Za-zÀ-ÿÆØÅæøå.\- ]{2,})/i,
    ) ||
    t.match(/([A-Za-zÀ-ÿÆØÅæøå.\- ]{3,}?\s+\d+[A-Za-z]?)\s+(\d{4})\s+([A-Za-zÀ-ÿÆØÅæøå.\- ]{2,})/i);

  if (!m) return null;
  const streetRaw = stripUnitNoise(m[1]);
  const postnr = m[2];
  const cityRaw = m[3].replace(/\s+/g, ' ').trim();
  return { streetRaw, postnr, cityRaw };
}

function swapDanishAccents(s: string) {
  // Generate 3 common accent permutations
  return [
    s,
    s.replace(/\boe/gi, 'ø').replace(/\bae/gi, 'æ').replace(/\baa/gi, 'å'),
    s.replace(/ø/gi, 'oe').replace(/æ/gi, 'ae').replace(/å/gi, 'aa'),
  ];
}

export function generateVariants(skel: ParsedSkeleton) {
  const base = skel.streetRaw.replace(/\s+/g, ' ').trim();

  const hasType = STREET_TYPES.some((t) => base.toLowerCase().endsWith(' ' + t));
  const streets = new Set<string>();

  const add = (v: string) => swapDanishAccents(v).forEach((x) => streets.add(x));

  add(base);
  if (!hasType) STREET_TYPES.forEach((t) => add(`${base} ${t}`));

  const cityKey = skel.cityRaw.toLowerCase();
  const city = CITY_SYNONYMS[cityKey] ?? skel.cityRaw;

  return { postnr: skel.postnr, city, streets: [...streets] };
}

/* ----------------------- ranking helpers (server use) --------------------- */

export function levenshtein(a: string, b: string) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

export function streetSimilarity(a: string, b: string) {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  const d = levenshtein(aa, bb);
  const max = Math.max(aa.length, bb.length) || 1;
  return 1 - d / max; // 0..1
}
