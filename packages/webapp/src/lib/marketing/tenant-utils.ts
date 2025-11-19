/**
 * Client-safe tenant utility functions
 * These functions can be used in browser/client code without Node.js dependencies
 */

/**
 * Normalize Danish characters to ASCII equivalents
 * @param str - String to normalize
 * @returns String with Danish characters converted (æ→ae, ø→oe, å→aa)
 */
function normalizeDanishChars(str: string): string {
  return str
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/Æ/g, 'Ae')
    .replace(/Ø/g, 'Oe')
    .replace(/Å/g, 'Aa')
}

/**
 * Generate short tenant ID from initials for long names
 * @param name - Club name (e.g., "Københavns Bedste Drenge Badmintonklub")
 * @returns Short tenant ID (e.g., "kbdb")
 */
function generateShortTenantId(name: string): string {
  // Normalize Danish characters first
  const normalized = normalizeDanishChars(name)
  
  // Get all words (including stop words for initials)
  const allWords = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters (after normalization)
    .split(/\s+/)
    .filter(word => word.length > 0)
  
  if (allWords.length === 0) return 'club'
  
  // If only one word, use first 8 characters
  if (allWords.length === 1) {
    return allWords[0].substring(0, 8)
  }
  
  // Generate initials from first letters of ALL words
  let initials = allWords.map(word => word[0]).join('')
  
  // If initials are too short (< 3), add more letters from first word
  if (initials.length < 3 && allWords[0].length > 1) {
    initials = allWords[0].substring(0, Math.min(4, allWords[0].length)) + initials.substring(1)
  }
  
  // Limit to 8 characters max
  return initials.substring(0, 8)
}

/**
 * Convert tenant name to valid subdomain
 * @param name - Tenant name (e.g., "Herlev Hjorten")
 * @returns Valid subdomain (e.g., "herlev-hjorten" or "kbdb" for long names)
 */
export function nameToSubdomain(name: string): string {
  // Normalize Danish characters first
  const normalized = normalizeDanishChars(name)
  
  // First, remove stop words to get meaningful words
  const stopWords = ['badmintonklub', 'badminton', 'klub', 'forening', 'sport', 'club']
  const meaningfulWords = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters (after normalization)
    .split(/\s+/)
    .filter(word => word.length > 0 && !stopWords.includes(word))
  
  if (meaningfulWords.length === 0) {
    return 'club'
  }
  
  // Create cleaned version from meaningful words
  const cleaned = meaningfulWords
    .join('-') // Join with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  
  // If cleaned name is longer than 20 characters, use short version
  if (cleaned.length > 20) {
    return generateShortTenantId(name)
  }
  
  return cleaned
}

