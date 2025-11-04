export function parsePossibleCPR(raw: string): { cpr?: string; digits?: string } {
  const cpr = raw.match(/\b(\d{6})[-\s]?(\d{4})\b/);
  if (cpr) return { cpr: `${cpr[1]}-${cpr[2]}` };
  const digits = raw.replace(/\D+/g, '');
  return digits ? { digits } : {};
}
