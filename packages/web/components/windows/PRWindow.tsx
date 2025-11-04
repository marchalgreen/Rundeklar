// src/components/windows/PRWindow.tsx
'use client';

import * as React from 'react';
import { usePurchaseRequests } from '@/store/purchaseRequests';
import type { PurchaseRequestDraft } from '@/store/purchaseRequests';
import { purchaseRequestToCsv } from '@/lib/export/prCsv';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Download,
  Inbox,
  Mail,
  PackagePlus,
  Plus,
  Trash2,
} from 'lucide-react';

type Props = { payload?: { id?: string } };

type DraftForEmail = {
  id: string;
  label: string;
  supplierHint?: string | null;
  contactEmail?: string | null;
  note?: string | null;
  lines: { itemId?: string | null; sku: string; name: string; qty: number; supplierHint?: string | null }[];
};

function downloadCsv(draft: PurchaseRequestDraft) {
  const csv = purchaseRequestToCsv({
    supplierHint: draft.supplierHint ?? null,
    lines: draft.lines.map((line) => ({
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      supplierHint: line.supplierHint ?? null,
    })),
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeLabel = draft.label.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
  link.href = url;
  link.download = `${safeLabel || 'purchase-request'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toEmailPayload(draft: PurchaseRequestDraft): DraftForEmail {
  return {
    id: draft.id,
    label: draft.label,
    supplierHint: draft.supplierHint ?? null,
    contactEmail: draft.contactEmail ?? null,
    note: draft.note ?? null,
    lines: draft.lines.map((line) => ({
      itemId: line.itemId,
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      supplierHint: line.supplierHint ?? null,
    })),
  };
}

export default function PRWindow({ payload }: Props) {
  const {
    drafts,
    selectedId,
    selectDraft,
    createDraft,
    updateDraft,
    setLineQty,
    removeLine,
    deleteDraft,
    markReceived,
  } = usePurchaseRequests();

  const selectedDraft = React.useMemo(
    () => drafts.find((d) => d.id === selectedId) ?? null,
    [drafts, selectedId],
  );

  React.useEffect(() => {
    if (!payload?.id) return;
    const exists = drafts.find((d) => d.id === payload.id);
    if (exists) selectDraft(exists.id);
  }, [payload?.id, drafts, selectDraft]);

  React.useEffect(() => {
    if (selectedDraft || drafts.length === 0) return;
    selectDraft(drafts[0].id);
  }, [selectedDraft, drafts, selectDraft]);

  const [emailStatus, setEmailStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEmailStatus('idle');
    setEmailError(null);
  }, [selectedDraft?.id]);

  const totalLines = selectedDraft?.lines.length ?? 0;
  const totalQty = selectedDraft?.lines.reduce((acc, line) => acc + line.qty, 0) ?? 0;

  const canExport = !!selectedDraft && selectedDraft.lines.length > 0;
  const canEmail =
    !!selectedDraft &&
    !!selectedDraft.contactEmail &&
    selectedDraft.contactEmail.trim().length > 3 &&
    selectedDraft.lines.length > 0;
  const canReceive = !!selectedDraft && selectedDraft.lines.length > 0 && selectedDraft.status !== 'received';

  const statusBadge = selectedDraft?.status === 'received' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Modtaget
    </span>
  ) : selectedDraft ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
      <Inbox className="h-3.5 w-3.5" /> Udkast
    </span>
  ) : null;

  const handleEmail = async () => {
    if (!selectedDraft || !canEmail) return;
    setEmailStatus('sending');
    setEmailError(null);

    try {
      const res = await fetch('/api/email/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: toEmailPayload(selectedDraft) }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Kunne ikke sende email');
      }
      setEmailStatus('sent');
    } catch (err) {
      setEmailStatus('error');
      setEmailError(err instanceof Error ? err.message : 'Ukendt fejl ved afsendelse');
    }
  };

  const handleMarkReceived = () => {
    if (!selectedDraft) return;
    markReceived(selectedDraft.id);
  };

  return (
    <div className="p-3 md:p-4 h-full flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Purchase Requests</h2>
          <p className="text-xs text-muted-foreground">
            Opret udkast, eksportér CSV og marker varer som modtaget.
          </p>
        </div>
        <button
          className="tahoe-ghost inline-flex items-center gap-1 rounded-xl border-hair px-3 py-1 text-xs hover:u-glass"
          onClick={() => {
            const draft = createDraft();
            selectDraft(draft.id);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Ny anmodning
        </button>
      </div>

      <div className="flex-1 min-h-0 flex gap-3">
        <aside className="w-64 shrink-0 space-y-2">
          <div className="rounded-2xl border border-hair bg-white/70 backdrop-blur-sm">
            {drafts.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">
                Ingen udkast endnu. Brug "Ny anmodning" eller tilføj varer fra lagerlisten.
              </div>
            ) : (
              <ul className="divide-y divide-hair/70">
                {drafts.map((draft) => {
                  const qty = draft.lines.reduce((acc, line) => acc + line.qty, 0);
                  return (
                    <li key={draft.id}>
                      <button
                        onClick={() => selectDraft(draft.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 transition-colors',
                          selectedDraft?.id === draft.id
                            ? 'bg-[hsl(var(--surface-2))]'
                            : 'hover:bg-[hsl(var(--surface-1))]'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{draft.label}</span>
                          <span className="text-[11px] text-muted-foreground">{draft.lines.length} linjer</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{qty} stk.</span>
                          <span>{draft.status === 'received' ? 'Modtaget' : 'Udkast'}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {selectedDraft ? (
            <div className="h-full flex flex-col gap-3">
              <div className="rounded-2xl border border-hair bg-white/70 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-2 min-w-[220px] flex-1">
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block">
                        Navn
                      </label>
                      <input
                        value={selectedDraft.label}
                        onChange={(e) => updateDraft(selectedDraft.id, { label: e.target.value })}
                        className="tahoe-input mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block">
                        Leverandør hint
                      </label>
                      <input
                        value={selectedDraft.supplierHint ?? ''}
                        onChange={(e) => updateDraft(selectedDraft.id, { supplierHint: e.target.value })}
                        className="tahoe-input mt-1 w-full"
                        placeholder="Fx MOSCOT, Ørgreen…"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block">
                        Kontakt email
                      </label>
                      <input
                        value={selectedDraft.contactEmail ?? ''}
                        onChange={(e) => updateDraft(selectedDraft.id, { contactEmail: e.target.value })}
                        className="tahoe-input mt-1 w-full"
                        placeholder="leverandor@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block">
                        Noter
                      </label>
                      <textarea
                        value={selectedDraft.note ?? ''}
                        onChange={(e) => updateDraft(selectedDraft.id, { note: e.target.value })}
                        className="tahoe-input mt-1 w-full min-h-[64px]"
                        placeholder="Evt. PO-nummer, leveringsinfo…"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs">
                    {statusBadge}
                    <div className="text-muted-foreground">{totalLines} linjer</div>
                    <div className="font-medium">{totalQty} stk.</div>
                    {selectedDraft.receivedAt ? (
                      <div className="text-[11px] text-muted-foreground">
                        Modtaget {new Date(selectedDraft.receivedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="tahoe-ghost inline-flex items-center gap-1 rounded-xl border-hair px-3 py-1 text-xs hover:u-glass disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canExport}
                    onClick={() => selectedDraft && downloadCsv(selectedDraft)}
                  >
                    <Download className="h-3.5 w-3.5" /> Eksportér CSV
                  </button>
                  <button
                    className="tahoe-ghost inline-flex items-center gap-1 rounded-xl border-hair px-3 py-1 text-xs hover:u-glass disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canEmail || emailStatus === 'sending'}
                    onClick={handleEmail}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {emailStatus === 'sending' ? 'Sender…' : emailStatus === 'sent' ? 'Sendt!' : 'Send email'}
                  </button>
                  <button
                    className="tahoe-ghost inline-flex items-center gap-1 rounded-xl border-hair px-3 py-1 text-xs hover:u-glass disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canReceive}
                    onClick={handleMarkReceived}
                  >
                    <PackagePlus className="h-3.5 w-3.5" /> Marker som modtaget
                  </button>
                  <button
                    className="tahoe-ghost inline-flex items-center gap-1 rounded-xl border-hair px-3 py-1 text-xs hover:u-glass"
                    onClick={() => deleteDraft(selectedDraft.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Slet
                  </button>
                </div>
                {emailStatus === 'error' && emailError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {emailError}
                  </div>
                ) : null}
                {emailStatus === 'sent' ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Email sendt (demotilstand).
                  </div>
                ) : null}
              </div>

              <div className="flex-1 min-h-0 rounded-2xl border border-hair bg-white/70 p-4">
                {selectedDraft.lines.length === 0 ? (
                  <div className="h-full grid place-items-center text-muted-foreground text-sm text-center">
                    Ingen linjer endnu. Højreklik på en vare i lageret og vælg "Tilføj til PR".
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '100%' }}>
                    {selectedDraft.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-hair/60 bg-white/80 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{line.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{line.sku}</div>
                          {(line.supplierHint ?? selectedDraft.supplierHint) ? (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {line.supplierHint ?? selectedDraft.supplierHint}
                            </div>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={line.qty}
                          onChange={(e) => setLineQty(selectedDraft.id, line.id, Number(e.target.value))}
                          className="tahoe-input w-20 text-right"
                        />
                        <button
                          className="tahoe-ghost inline-flex items-center gap-1 rounded-lg border-hair px-2 py-1 text-xs hover:u-glass"
                          onClick={() => removeLine(selectedDraft.id, line.id)}
                          title="Fjern linje"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-hair bg-white/70 grid place-items-center text-sm text-muted-foreground">
              Ingen anmodning valgt.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
