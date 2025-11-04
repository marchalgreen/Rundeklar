'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Customer } from '@/lib/mock/customers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PaperPlaneTilt, X } from '@phosphor-icons/react';

type Props = {
  payload?: {
    customer?: Customer;
    prefill?: string;
  };
};

export default function SMSComposer({ payload }: Props) {
  const c = payload?.customer;
  const [msg, setMsg] = useState(
    payload?.prefill ??
      (c
        ? `Hej ${c.firstName}, vi bekræfter din tid hos os. Svar gerne hvis du har spørgsmål.`
        : '')
  );
  const counter = useMemo(() => {
    const len = msg.trim().length;
    // naive segments (GSM-7): 160 per segment, concat = 153
    const seg = len <= 160 ? 1 : Math.ceil(len / 153);
    return { len, seg };
  }, [msg]);

  useEffect(() => {
    // autofocus when window mounts (if embedded inside a window shell)
    const t = document.getElementById('sms-textarea') as HTMLTextAreaElement | null;
    t?.focus();
    t?.setSelectionRange(t.value.length, t.value.length);
  }, []);

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">Ny SMS</div>
          <div className="text-foreground/65">Til: {c ? `${c.firstName} ${c.lastName}` : '—'}</div>
        </div>
        <Button variant="secondary" className="gap-1.5" onClick={() => window.history.back()}>
          <X size={16} />
          Luk
        </Button>
      </div>

      <Textarea
        id="sms-textarea"
        rows={10}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        className="w-full"
        placeholder="Skriv din besked…"
      />

      <div className="flex items-center justify-between text-xs text-foreground/65">
        <div>
          {counter.len} tegn · {counter.seg} SMS
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setMsg((m) => m + '\n\n— Venlig hilsen, VisionSuite');
            }}
          >
            Tilføj signatur
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              // TODO: call API to actually send
              toast('SMS sendt', { description: 'Beskeden er afsendt.' });
            }}
          >
            <PaperPlaneTilt size={16} />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
