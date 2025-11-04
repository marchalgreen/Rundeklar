// src/lib/scan/address-ocr.ts
// ------------------------------------------------------------
// PARKED: Self-contained address OCR utilities + runner.
// The feature is OFF by default. When you want it back, set
// ADDRESS_OCR_ENABLED = true and call runAddressOCR(...) from
// your scanner. No UI dependencies here.
// ------------------------------------------------------------

export type CanonicalAddress = {
  street: string;
  postalCode: string;
  city: string;
  country?: string;
  raw?: string;
};

export const ADDRESS_OCR_ENABLED = false; // <- master switch

/* ======================== Normalization ======================== */

export function normalizeOcrText(text: string) {
  return text
    .replace(/[|]/g, 'l')
    .replace(/(?<=\d)[iI]/g, '1')
    .replace(/[iI](?=\d)/g, '1')
    .replace(/\bSY\b/gi, 'SV')
    .replace(/\b0(?=[A-Za-z])/g, 'O')
    .replace(/(?<=\s)[Oo](?=\d)/g, '0')
    .replace(/\u00A0/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const STREET_TYPES = [
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

function stripUnitNoise(str: string) {
  return str.replace(/\b(?:st|kl|mf|tv|th|kld|mfl|[0-9]{1,2}\.?\s*(?:tv|th|mf))\b.*$/i, '').trim();
}

function toTitleCaseDk(s: string) {
  return s.replace(/\b([a-zæøå])/g, (m) => m.toUpperCase());
}

export function parseDanishAddress(text: string): CanonicalAddress | null {
  const src = normalizeOcrText(text)
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const patterns = [
    /([A-Za-zÀ-ÿÆØÅæøå.\- ]{3,}\s+\d+[A-Za-z]?)\s*[, ]+\s*(\d{4})\s+([A-Za-zÀ-ÿÆØÅæøå.\- ]{2,})/i,
    /([A-Za-zÀ-ÿÆØÅæøå.\- ]{3,}\s+\d+[A-Za-z]?)\s+(\d{4})\s+([A-Za-zÀ-ÿÆØÅæøå.\- ]{2,})/i,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (!m) continue;
    let street = stripUnitNoise(m[1]).replace(/\s+/g, ' ').trim();
    const postalCode = m[2];
    let city = m[3].replace(/\s+/g, ' ').trim();

    // leave missing type to external validation later
    const _hasType = STREET_TYPES.some((t) => street.toLowerCase().endsWith(' ' + t));

    street = toTitleCaseDk(street);
    city = toTitleCaseDk(city);
    return { street, postalCode, city, country: 'Danmark', raw: src };
  }
  return null;
}

/* ======================== Runner (disabled) ======================== */
/**
 * runAddressOCR
 * Minimal contract you can call later from the scanner. Currently returns null
 * if ADDRESS_OCR_ENABLED is false so it’s a no-op.
 *
 * @param grabFrame  A function that returns an HTMLCanvasElement of the current video frame
 * @param opts       Optional tuning knobs
 */
export async function runAddressOCR(
  grabFrame: () => HTMLCanvasElement | null,
  opts?: { throttleMs?: number },
): Promise<CanonicalAddress | null> {
  if (!ADDRESS_OCR_ENABLED) return null;

  // If you enable later, you can move in the full preprocess + Tesseract code here,
  // or import it from a second file. For now we return null so the caller stays silent.
  void grabFrame;
  void opts;
  return null;
}
