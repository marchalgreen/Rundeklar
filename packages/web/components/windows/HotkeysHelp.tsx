'use client';

type Props = { payload?: unknown };

const hotkeys: { combo: string; description: string }[] = [
  { combo: '⌘ / Ctrl + `', description: 'Cycle focus between windows' },
  { combo: 'Esc', description: 'Minimize focused window' },
  { combo: '⌘ / Ctrl + M', description: 'Toggle minimize / restore' },
  { combo: '⌘ / Ctrl + Shift + X', description: 'Close focused window' },
  { combo: '⌘ / Ctrl + ↑', description: 'Maximize focused window' },
  { combo: '⌘ / Ctrl + ↓', description: 'Minimize focused window' },
  { combo: '⌘ / Ctrl + ←', description: 'Snap window to left half' },
  { combo: '⌘ / Ctrl + →', description: 'Snap window to right half' },
];

export default function HotkeysHelp({ payload: _payload }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-800">Tastaturgenveje</h2>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {hotkeys.map((hk) => (
            <tr key={hk.combo} className="border-b last:border-0">
              <td className="py-2 pr-4 font-mono text-zinc-700">{hk.combo}</td>
              <td className="py-2 text-zinc-600">{hk.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-zinc-400">⌘ is Command on macOS, Ctrl on Windows/Linux.</p>
    </div>
  );
}
