export function titleCaseWord(word: string): string {
  if (!word) return word;
  if (/[0-9]/.test(word)) return word.trim();
  if (word.toUpperCase() === word) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function normalizeColorName(input?: string | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed
    .replace(/\s+/g, ' ')
    .replace(/["']/g, '')
    .replace(/(?:size|with)\s+\d+.*/i, '')
    .replace(/\/\s*\d+.*/g, '')
    .trim();
  if (!cleaned) return undefined;

  const segments = cleaned.split(/[\/]/).map((segment) =>
    segment
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word) => titleCaseWord(word))
      .join(' '),
  );

  const normalized = segments.join(' / ').trim();
  if (!normalized) return undefined;
  if (/^unknown$/i.test(normalized)) return undefined;
  return normalized;
}
