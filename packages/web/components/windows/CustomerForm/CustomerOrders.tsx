'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function CustomerOrders({ hue }: { hue: number }) {
  return (
    <div
      className="rounded-xl border border-border card-surface p-3"
      style={{ boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-medium text-foreground/80">Ordrer</div>
        <Button variant="secondary" size="sm" className="chip">
          Ny ordre
        </Button>
      </div>
      <Separator className="my-2" />
      <div className="text-sm text-foreground/65">
        Ingen ordrer endnu. Når du opretter en stel/glas- eller linseordre dukker den op her.
      </div>
    </div>
  );
}
