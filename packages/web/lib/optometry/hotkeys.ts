export type DialogHotkey = '1' | '2' | '3' | 'n' | 'arrowup' | 'arrowdown';

export function mapKey(e: KeyboardEvent): DialogHotkey | null {
  const k = e.key.toLowerCase();
  if (k === '1' || k === '2' || k === '3' || k === 'n' || k === 'arrowup' || k === 'arrowdown')
    return k as DialogHotkey;
  return null;
}
