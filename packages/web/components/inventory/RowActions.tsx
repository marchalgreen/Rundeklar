'use client';

import { Button } from '@/components/ui/button';
import { useInventory } from '@/store/inventory';

type Props = {
  id: string;
  name: string;
  onAdjust: () => void;
  onLabels: () => void;
};

/**
 * Minimal hover actions (no context-menu dependency).
 * - Shows ± controls on hover
 * - Provides "Juster" / "Etiketter" small buttons inline if needed
 * You can enhance later with a right-click menu once the context-menu primitive exists.
 */
export default function RowActions({ id, name, onAdjust, onLabels }: Props) {
  const { adjustQty } = useInventory();

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2"
        onClick={() => adjustQty(id, -1)}
        title="Minus 1"
        aria-label={`Minus 1 for ${name}`}
      >
        −
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2"
        onClick={() => adjustQty(id, +1)}
        title="Plus 1"
        aria-label={`Plus 1 for ${name}`}
      >
        +
      </Button>

      {/* Optional inline quick actions */}
      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onAdjust} title="Juster">
        Juster
      </Button>
      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onLabels} title="Etiketter">
        Etiketter
      </Button>
    </div>
  );
}
