// src/components/scan/IDScanOverlay.tsx
'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import IDCardScanner from './IDCardScanner';
import { cn } from '@/lib/utils/cn';
import { useDesktop } from '@/store/desktop';
import type { Customer } from '@/lib/mock/customers';
import { X } from '@phosphor-icons/react';

function isoFromCprFront(front: string): string | null {
  if (!/^\d{6}$/.test(front)) return null;
  const dd = +front.slice(0, 2);
  const mm = +front.slice(2, 4);
  const yy = +front.slice(4, 6);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  const yFull = yy >= 30 ? 1900 + yy : 2000 + yy;
  const d = new Date(Date.UTC(yFull, mm - 1, dd));
  if (d.getUTCFullYear() !== yFull || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd)
    return null;
  return d.toISOString().slice(0, 10);
}

export type IDScanOverlayProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (id: string, rawText: string) => void;
};

export default function IDScanOverlay({ open, onOpenChange, onScan }: IDScanOverlayProps) {
  const openDesktop = useDesktop((s) => s.open);

  const [tab, setTab] = React.useState<'scan' | 'manual'>('scan');

  // Barcode result (from scanner)
  const [scanned, setScanned] = React.useState<{ id: string; raw: string } | null>(null);

  // OCR address (still supported if you re-enable later)
  const [ocrAddress, setOcrAddress] = React.useState<{
    street: string;
    postalCode: string;
    city: string;
    country: string;
    raw?: string;
  } | null>(null);

  // Manual fields
  const [manualCPR, setManualCPR] = React.useState('');
  const [manualFirst, setManualFirst] = React.useState('');
  const [manualLast, setManualLast] = React.useState('');

  // “Search existing” loading
  const [checking, setChecking] = React.useState(false);

  // Fresh state whenever dialog opens
  React.useEffect(() => {
    if (!open) return;
    setTab('scan');
    setScanned(null);
    setOcrAddress(null);
    setManualCPR('');
    setManualFirst('');
    setManualLast('');
    setChecking(false);
  }, [open]);

  const parsed = React.useMemo(() => {
    const idStr = scanned?.id || manualCPR || '';
    if (!idStr) return null;
    const rawDigits = idStr.replace(/\D+/g, '');
    const front = rawDigits.slice(0, 6);
    const iso = front.length === 6 ? isoFromCprFront(front) : null;
    const cprMasked = front ? `${front}-xxxx` : undefined;
    const cprFull = /^\d{6}-\d{4}$/.test(idStr) ? idStr : undefined;
    return { front, iso, cprMasked, cprFull, idStr };
  }, [scanned, manualCPR]);

  async function resolveCustomer(id: string) {
    setChecking(true);
    onScan(id, scanned?.raw ?? id);
    try {
      const res = await fetch('/api/id-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();

      if (res.ok && j?.found && j?.matchedCustomer?.id) {
        const c = j.matchedCustomer as Partial<Customer>;
        const existing: Customer = {
          id: c.id!,
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          gender: c.gender,
          birthdate: c.birthdate,
          email: c.email || '',
          phoneMobile: c.phoneMobile || '',
          phoneWork: c.phoneWork || '',
          address: c.address || { street: '', postalCode: '', city: '', country: 'Danmark' },
          tags: c.tags || [],
          notes: c.notes || '',
          customerNo: (c as any).customerNo,
          lastActivity: c.lastActivity,
          balanceDKK: c.balanceDKK,
          cprMasked: c.cprMasked,
          cprFull: c.cprFull,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          marketingConsent: c.marketingConsent ?? true,
          preferredChannel: (c.preferredChannel as any) || 'sms',
          language: (c.language as any) || 'da',
        };

        openDesktop({
          type: 'customerForm',
          title: `${existing.firstName} ${existing.lastName}`.trim() || 'Kundekort',
          payload: { customer: existing },
        });
        onOpenChange(false);
        return;
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  function createCustomerDraft(opts?: { cpr?: string; firstName?: string; lastName?: string }) {
    const idStr = (opts?.cpr || scanned?.id || '').trim();
    if (!idStr) return;

    const rawDigits = idStr.replace(/\D+/g, '');
    const front = rawDigits.slice(0, 6);
    const iso = front.length === 6 ? isoFromCprFront(front) : null;
    const cprMasked = front ? `${front}-xxxx` : undefined;
    const cprFull = /^\d{6}-\d{4}$/.test(idStr) ? idStr : undefined;

    const draft: Customer = {
      id: `new_${Math.random().toString(36).slice(2, 7)}`,
      firstName: opts?.firstName || '',
      lastName: opts?.lastName || '',
      gender: undefined,
      birthdate: iso || undefined,
      email: '',
      phoneMobile: '',
      phoneWork: '',
      address: ocrAddress
        ? {
            street: ocrAddress.street,
            postalCode: ocrAddress.postalCode,
            city: ocrAddress.city,
            country: ocrAddress.country || 'Danmark',
          }
        : { street: '', postalCode: '', city: '', country: 'Danmark' },
      tags: [],
      notes: ocrAddress?.raw ? `Adresse OCR: ${ocrAddress.raw}` : '',
      customerNo: undefined,
      lastActivity: undefined,
      balanceDKK: undefined,
      cprMasked,
      cprFull,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      marketingConsent: true,
      preferredChannel: 'sms',
      language: 'da',
    };

    openDesktop({ type: 'customerForm', title: 'Ny kunde', payload: { customer: draft } });
    onOpenChange(false);
  }

  // With OCR parked, allow actions as soon as we have a barcode
  const actionsEnabled = !!scanned && !checking;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          'z-[130] sm:max-w-[900px] rounded-2xl border border-hair bg-white/85 backdrop-blur-md',
          'shadow-[0_24px_120px_rgba(0,0,0,.18)] px-3 sm:px-4 pb-4',
        )}
      >
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,.18)]" />
              <AlertDialogTitle className="truncate text-[15px]">
                Scan sundhedskort / ID
              </AlertDialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {(tab === 'manual' || scanned) && (
                <button
                  type="button"
                  className="tahoe-ghost h-8 px-3 text-[12px]"
                  onClick={() => {
                    setTab('scan');
                    setScanned(null);
                    setOcrAddress(null);
                  }}
                >
                  Scan igen
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="tahoe-ghost h-8 w-8 grid place-items-center rounded-lg"
                title="Luk"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Tabs */}
        <div className="mt-1 mb-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('scan')}
            className={cn(
              'tahoe-ghost h-8 px-3 text-[12px] relative',
              tab === 'scan' && 'bg-white ring-1 ring-[hsl(var(--accent-blue))]',
            )}
          >
            Scan
            {tab === 'scan' && (
              <span
                className="absolute left-2 right-2 -bottom-[2px] h-[2px] rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, hsl(var(--accent-blue)), transparent)',
                }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={cn(
              'tahoe-ghost h-8 px-3 text-[12px] relative',
              tab === 'manual' && 'bg-white ring-1 ring-[hsl(var(--accent-blue))]',
            )}
          >
            Manuel
            {tab === 'manual' && (
              <span
                className="absolute left-2 right-2 -bottom-[2px] h-[2px] rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, hsl(var(--accent-blue)), transparent)',
                }}
              />
            )}
          </button>
        </div>

        {/* Scanner */}
        {open && tab === 'scan' && !scanned && (
          <div className="mt-2">
            <IDCardScanner
              active={open && tab === 'scan'}
              forceStop={!!scanned} // stop scanner immediately after a hit
              onScan={(id, raw) => {
                if (id === '__OCR_ADDRESS__') {
                  try {
                    const a = JSON.parse(raw);
                    setOcrAddress({
                      street: a.street || '',
                      postalCode: a.postalCode || '',
                      city: a.city || '',
                      country: a.country || 'Danmark',
                      raw: a.raw,
                    });
                  } catch {}
                  return;
                }
                // BARCODE hit
                if (!scanned) setScanned({ id, raw });
              }}
              onClose={() => onOpenChange(false)}
              helperText="Peg kortets stregkode ind i feltet. Brug Zoom + hvis fokus driller."
            />
          </div>
        )}

        {/* Manual entry */}
        {tab === 'manual' && (
          <div className="mt-2 grid gap-3 rounded-xl border border-border bg-paper p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-xs text-foreground/65 sm:col-span-1">
                <div className="mb-1">CPR (ddmmåå-xxxx eller tal)</div>
                <input
                  className="tahoe-input w-full"
                  value={manualCPR}
                  onChange={(e) => setManualCPR(e.target.value)}
                  placeholder="ddmmåå-xxxx"
                  inputMode="numeric"
                />
              </label>
              <label className="text-xs text-foreground/65">
                <div className="mb-1">Fornavn</div>
                <input
                  className="tahoe-input w-full"
                  value={manualFirst}
                  onChange={(e) => setManualFirst(e.target.value)}
                  placeholder="Fornavn"
                />
              </label>
              <label className="text-xs text-foreground/65">
                <div className="mb-1">Efternavn</div>
                <input
                  className="tahoe-input w-full"
                  value={manualLast}
                  onChange={(e) => setManualLast(e.target.value)}
                  placeholder="Efternavn"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="chip"
                onClick={() => {
                  const cid = manualCPR.trim() || scanned?.id || '';
                  if (!cid) return;
                  createCustomerDraft({
                    cpr: cid,
                    firstName: manualFirst.trim(),
                    lastName: manualLast.trim(),
                  });
                }}
              >
                Opret ny kunde
              </Button>

              <Button
                className="chip !bg-[hsl(var(--accent-blue))] !text-white !border-transparent hover:brightness-105"
                onClick={() => {
                  const cid = manualCPR.trim();
                  if (cid) void resolveCustomer(cid);
                }}
                disabled={!manualCPR.trim() || checking}
              >
                {checking ? 'Søger…' : 'Søg eksisterende'}
              </Button>
            </div>
          </div>
        )}

        {/* Result + actions */}
        {scanned && (
          <div className="mt-3 grid gap-3 rounded-xl border border-border bg-paper p-3 animate-in fade-in-0 duration-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[12px] shadow-sm">
                ✓
              </span>
              <div className="text-[13px] font-medium">Stregkode læst</div>
              {ocrAddress && (
                <span className="ml-2 text-[12px] text-emerald-700">Adresse fundet</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="text-foreground/65">CPR</div>
              <div className="font-medium">{scanned.id}</div>

              {!!ocrAddress && (
                <>
                  <div className="text-foreground/65">Adresse</div>
                  <div className="font-medium">
                    {ocrAddress.street}, {ocrAddress.postalCode} {ocrAddress.city}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="default" // use primary (blue)
                className="!text-white" // harden against any inherited text color
                onClick={() =>
                  createCustomerDraft({
                    cpr: scanned?.id || manualCPR.trim(),
                    firstName: manualFirst.trim(),
                    lastName: manualLast.trim(),
                  })
                }
                disabled={!actionsEnabled}
                title={!actionsEnabled ? 'Vent venligst…' : undefined}
              >
                Opret ny kunde
              </Button>

              <Button
                className="chip !bg-[hsl(var(--accent-blue))] !text-white !border-transparent hover:brightness-105"
                onClick={() => {
                  if (scanned?.id) void resolveCustomer(scanned.id);
                }}
                disabled={!scanned || checking}
              >
                {checking ? 'Søger…' : 'Søg eksisterende'}
              </Button>
            </div>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
