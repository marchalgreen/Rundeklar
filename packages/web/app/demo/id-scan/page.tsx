'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import IDScanOverlay from '@/components/scan/IDScanOverlay';

export default function IDScanDemoPage() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [idValue, setIdValue] = useState('');
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(id: string) {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch('/api/id-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Ukendt fejl');
      setResult(j);
    } catch (e: unknown) {
      setErr((e as Error)?.message || 'Fejl');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">ID-scan demo</h1>
        <p className="text-sm text-foreground/70">
          Scan sundhedskort/ID (QR / PDF417) eller indtast manuelt.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="id">ID (CPR eller andet numerisk)</Label>
          <Input
            id="id"
            placeholder="ddmmyy-xxxx eller tal"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
            className="w-[280px]"
          />
        </div>
        <Button onClick={() => submit(idValue)} disabled={!idValue || loading}>
          Slå op / Opret
        </Button>
        <Button variant="secondary" onClick={() => setOverlayOpen(true)}>
          Scan ID-kort
        </Button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {loading && <div className="text-sm opacity-70">Henter…</div>}

      {result && (
        <pre className="rounded-lg bg-surface-2 p-3 text-xs ring-1 ring-border overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <IDScanOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        onScan={(id) => {
          setIdValue(id);
          void submit(id);
        }}
      />
    </div>
  );
}
