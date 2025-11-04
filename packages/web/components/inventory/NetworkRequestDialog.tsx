// src/components/inventory/NetworkRequestDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeSinceISO } from "@/types/product";

type PartnerStock = {
  partner: string;
  location?: string;
  qty: number;
  updatedAt: string;
};

export interface NetworkRequestDialogProps {
  open: boolean;
  sku: string;
  name: string;
  partners: PartnerStock[];
  onClose: () => void;
  onSend: (partner: { partner: string; location?: string }) => void;
}

export function NetworkRequestDialog({
  open,
  sku,
  name,
  partners,
  onClose,
  onSend,
}: NetworkRequestDialogProps) {
  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => b.qty - a.qty);
  }, [partners]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedKey(null);
      return;
    }

    const firstAvailable = sortedPartners.find((p) => p.qty > 0);
    if (firstAvailable) {
      setSelectedKey(`${firstAvailable.partner}|${firstAvailable.location ?? ""}`);
    } else {
      setSelectedKey(null);
    }
  }, [open, sortedPartners]);

  const selectedPartner = useMemo(() => {
    if (!selectedKey) return null;
    return (
      sortedPartners.find(
        (p) => `${p.partner}|${p.location ?? ""}` === selectedKey,
      ) ?? null
    );
  }, [selectedKey, sortedPartners]);

  const handleSend = () => {
    if (!selectedPartner) return;
    onSend({ partner: selectedPartner.partner, location: selectedPartner.location });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent
        aria-describedby="network-request-description"
        className="max-w-md"
      >
        <DialogHeader className="space-y-3 text-left">
          <div className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">
            CLAIRITY NETWORK
          </div>
          <DialogTitle className="text-[18px] font-semibold leading-snug text-foreground">
            {name || "Ukendt vare"}
          </DialogTitle>
          <DialogDescription id="network-request-description" className="text-sm">
            SKU: {sku || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[260px] overflow-y-auto pr-1" role="radiogroup">
          {sortedPartners.map((partner) => {
            const key = `${partner.partner}|${partner.location ?? ""}`;
            const isSelected = selectedKey === key;
            const disabled = partner.qty === 0;
            const qtyTone =
              partner.qty > 2
                ? "bg-[hsl(var(--svc-check)/0.15)] text-[hsl(var(--svc-check))]"
                : partner.qty > 0
                  ? "bg-[hsl(var(--svc-pickup)/0.18)] text-[hsl(var(--svc-pickup))]"
                  : "bg-[hsl(var(--line-soft))] text-[color-mix(in_oklab,hsl(var(--foreground))_50%,transparent)]";

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => setSelectedKey(key)}
                className={cn(
                  "group mt-2 flex w-full items-center justify-between rounded-lg border p-3 text-left transition",
                  "border-[hsl(var(--line-soft))] bg-white/70 hover:border-[hsl(var(--accent-blue))]/50 hover:bg-white/90",
                  disabled &&
                    "cursor-not-allowed opacity-60 hover:border-[hsl(var(--line-soft))] hover:bg-white/70",
                  isSelected && "border-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue))/8]",
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {partner.partner}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {partner.location || ""}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Opdateret {timeSinceISO(partner.updatedAt)} siden
                  </span>
                </div>

                <span
                  className={cn(
                    "inline-flex h-5 min-w-[38px] items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                    qtyTone,
                  )}
                >
                  {partner.qty}
                </span>
              </button>
            );
          })}
          {sortedPartners.length === 0 && (
            <div className="mt-2 rounded-lg border border-dashed border-[hsl(var(--line-soft))] p-4 text-center text-sm text-muted-foreground">
              Ingen partnere fundet for denne SKU.
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} type="button">
            Annullér
          </Button>
          <Button onClick={handleSend} disabled={!selectedPartner} type="button">
            Send forespørgsel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NetworkRequestDialog;
