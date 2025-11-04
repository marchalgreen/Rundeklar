'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useInventory, type AdjustmentReason } from '@/store/inventory';
import ModalShell from '@/components/inventory/ModalShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Minus,
  Plus,
  ClipboardText,
  ArrowDown,
  WarningCircle,
  ArrowUUpLeft,
  PencilLine,
  CaretDown,
  PlusCircle,
  MinusCircle,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const schema = z.object({
  amount: z.coerce
    .number()
    .int()
    .refine((n) => Number.isFinite(n), 'Ugyldigt tal')
    .refine((n) => n >= 0, 'Brug et ikke-negativt tal'),
  reason: z.enum(['Stock take', 'Received', 'Damaged', 'Returned', 'Correction']),
  note: z.string().max(200).optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string | null;
  itemName?: string;
  initialReason?: AdjustmentReason;
  initialNote?: string;
};

export default function StockAdjustDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  initialReason,
  initialNote,
}: Props) {
  const { adjustWithReason, undoLast } = useInventory();
  const [amount, setAmount] = useState<string>('0'); // UI keeps amount non-negative
  const [reason, setReason] = useState<AdjustmentReason>('Stock take');
  const [note, setNote] = useState<string>('');
  const [dir, setDir] = useState<'add' | 'remove'>('add');

  // Canonical English reason -> Danish label + icon (UI only)
  const REASONS = useMemo(
    () =>
      [
        { id: 'Stock take', da: 'Lageroptælling', Icon: ClipboardText },
        { id: 'Received', da: 'Modtaget', Icon: ArrowDown },
        { id: 'Damaged', da: 'Beskadiget', Icon: WarningCircle },
        { id: 'Returned', da: 'Returneret', Icon: ArrowUUpLeft },
        { id: 'Correction', da: 'Korrigering', Icon: PencilLine },
      ] as const,
    [],
  );
  const reasonLabel = (id: AdjustmentReason) => REASONS.find((r) => r.id === id)?.da ?? id;

  const reasonMode = (id: AdjustmentReason): 'positive' | 'negative' | 'any' => {
    if (id === 'Received' || id === 'Returned') return 'positive';
    if (id === 'Damaged') return 'negative';
    return 'any';
  };
  const currentMode = reasonMode(reason);

  useEffect(() => {
    if (!open) return;
    const nextReason = initialReason ?? 'Stock take';
    setAmount('0');
    setReason(nextReason);
    setNote(initialNote ?? '');
    setDir(reasonMode(nextReason) === 'negative' ? 'remove' : 'add');
  }, [open, initialReason, initialNote]);

  useEffect(() => {
    if (currentMode === 'positive') setDir('add');
    if (currentMode === 'negative') setDir('remove');
  }, [currentMode]);

  const parsedAmount = Math.max(0, Number(amount) || 0);
  const helperText = useMemo(() => {
    if (parsedAmount === 0) return 'Indtast et tal større end 0.';
    if (currentMode === 'positive') return `Tilføjer ${parsedAmount} stk. til lageret.`;
    if (currentMode === 'negative') return `Fjerner ${parsedAmount} stk. fra lageret.`;
    return dir === 'add'
      ? `Tilføjer ${parsedAmount} stk. til lageret.`
      : `Fjerner ${parsedAmount} stk. fra lageret.`;
  }, [parsedAmount, currentMode, dir]);

  const onSubmit = () => {
    const parsed = schema.safeParse({ amount, reason, note: note || undefined });
    if (!parsed.success || !itemId) {
      toast.error('Tjek felterne igen');
      return;
    }
    const { amount: amtAbs, reason: rsn, note: nt } = parsed.data;
    if (amtAbs === 0) {
      toast.message('Ingen ændring udført');
      return;
    }
    const mode = reasonMode(rsn);
    const normalized =
      mode === 'positive'
        ? Math.abs(amtAbs)
        : mode === 'negative'
          ? -Math.abs(amtAbs)
          : dir === 'add'
            ? Math.abs(amtAbs)
            : -Math.abs(amtAbs);
    const res = adjustWithReason({ id: itemId, amount: normalized, reason: rsn, note: nt });
    if (!res) {
      toast.message('Ingen ændring udført');
      return;
    }
    const verb = normalized < 0 ? 'Fjernede' : 'Tilføjede';
    const suffix = itemName ? ` - ${itemName}` : '';
    toast.success(`${verb} ${Math.abs(normalized)} stk.${suffix}`, {
      action: {
        label: 'Fortryd',
        onClick: () => undoLast(res.token),
      },
    });
    onOpenChange(false);
    setAmount('0');
    setNote('');
    setReason(initialReason ?? 'Stock take');
    setDir(reasonMode(initialReason ?? 'Stock take') === 'negative' ? 'remove' : 'add');
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Juster antal"
      subtitle={itemName ?? 'Ukendt vare'}
      dotColor="hsl(var(--accent-blue))"
    >
      <form
        className="grid gap-3 p-3 rounded-xl bg-[hsl(var(--surface-2))]/40 border border-hair"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Reason dropdown with icons */}
        <div className="grid gap-1.5">
          <Label htmlFor="reason">Årsag</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                id="reason"
                type="button"
                className={cn(
                  'tahoe-input rounded-xl px-3 py-2 text-sm bg-white flex items-center justify-between gap-2',
                )}
              >
                <span className="flex items-center gap-2">
                  {(() => {
                    const R = REASONS.find((r) => r.id === reason)?.Icon ?? ClipboardText;
                    return <R className="h-4 w-4 opacity-90" />;
                  })()}
                  <span>{reasonLabel(reason)}</span>
                </span>
                <CaretDown className="h-4 w-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl p-1">
              <DropdownMenuLabel className="text-xs px-2">Vælg årsag</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {REASONS.map(({ id, da, Icon }) => (
                <DropdownMenuItem
                  key={id}
                  className="text-sm rounded-lg"
                  onSelect={() => setReason(id)}
                >
                  <Icon className="h-4 w-4 opacity-90" />
                  <span>{da}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Amount and direction (amount stored as non-negative) */}
        <div className="grid gap-1.5">
          <Label htmlFor="amount">Antal</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl border border-hair bg-white hover:bg-white hover:text-inherit disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() =>
                setAmount(String(Math.max(0, Math.trunc(Number(amount) || 0) - 1)))
              }
              aria-label="Minus 1"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="amount"
              inputMode="numeric"
              type="number"
              className="bg-white rounded-xl"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.trim() === '') {
                  setAmount('0');
                  return;
                }
                const next = Math.max(0, Number(raw));
                setAmount(Number.isFinite(next) ? String(Math.trunc(next)) : '0');
              }}
              placeholder="Angiv antal (fx 5)"
            />
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl border border-hair bg-white hover:bg-white hover:text-inherit disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() =>
                setAmount(String(Math.max(0, Math.trunc(Number(amount) || 0) + 1)))
              }
              aria-label="Plus 1"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {currentMode === 'any' ? (
            <div className="mt-1 inline-flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Retning</span>
              <div className="inline-flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'px-2 py-1 text-xs rounded-lg border transition-colors',
                    dir === 'add'
                      ? 'bg-[hsl(var(--accent-blue))] text-white border-transparent'
                      : 'bg-white border-hair hover:bg-white hover:text-inherit',
                  )}
                  onClick={() => setDir('add')}
                  aria-pressed={dir === 'add'}
                >
                  <PlusCircle className="mr-1 h-4 w-4" /> Tilføj
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'px-2 py-1 text-xs rounded-lg border transition-colors',
                    dir === 'remove'
                      ? 'bg-[hsl(var(--accent-blue))] text-white border-transparent'
                      : 'bg-white border-hair hover:bg-white hover:text-inherit',
                  )}
                  onClick={() => setDir('remove')}
                  aria-pressed={dir === 'remove'}
                >
                  <MinusCircle className="mr-1 h-4 w-4" /> Fjern
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">
              {currentMode === 'positive' ? 'Retning: Tilføj' : 'Retning: Fjern'}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 opacity-70" />
            <span>{helperText}</span>
          </div>
        </div>

        {/* Note */}
        <div className="grid gap-1.5">
          <Label htmlFor="note">Note (valgfri)</Label>
          <Input
            id="note"
            className="bg-white rounded-xl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tilføj en kort note"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuller
          </Button>
          <Button type="submit">Gem justering</Button>
        </div>
      </form>
    </ModalShell>
  );
}
