'use client';

import { useEffect, useRef, useState } from 'react';
import type { Customer } from '@/lib/mock/customers';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, MapPin, EnvelopeSimple, Phone } from '@phosphor-icons/react';

type AddressSuggestion = {
  tekst: string;
  data?: {
    postnummer?: {
      nr?: string;
      navn?: string;
    };
  };
};

function composeAddress(street = '', postalCode = '', city = '') {
  const left = street.trim();
  const right = [postalCode, city].filter(Boolean).join(' ').trim();
  return [left, right].filter(Boolean).join(', ');
}

function parseAddress(input: string): { street: string; postalCode: string; city: string } {
  const m = input.match(/^\s*(.+?)\s*,\s*(\d{4})\s+(.+?)\s*$/);
  if (m) return { street: m[1], postalCode: m[2], city: m[3] };
  const m2 = input.match(/^\s*(.+?)\s+(\d{4})\s+(.+?)\s*$/);
  if (m2) return { street: m2[1], postalCode: m2[2], city: m2[3] };
  return { street: input.trim(), postalCode: '', city: '' };
}

export default function CustomerDetails({
  local,
  touch,
  hue,
}: {
  local: Customer;
  touch: (assign: (c: Customer, v: string) => void) => (v: string) => void;
  hue: number;
}) {
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [cc, setCc] = useState('+45');
  const [phoneErr, setPhoneErr] = useState<string | null>(null);

  const [addrQ, setAddrQ] = useState(() =>
    composeAddress(local.address.street, local.address.postalCode, local.address.city)
  );
  const [addrOpts, setAddrOpts] = useState<Array<{ tekst: string; postnr: string; by: string }>>(
    []
  );
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrIdx, setAddrIdx] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const suppressOpenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    suppressOpenRef.current = true;
    const t = setTimeout(() => (suppressOpenRef.current = false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const q = addrQ.trim();
    if (!q || q.length < 3 || suppressOpenRef.current) {
      setAddrOpts([]);
      setAddrOpen(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ac;
    const t = setTimeout(async () => {
      try {
        const url = `https://api.dataforsyningen.dk/adresser/autocomplete?q=${encodeURIComponent(
          q
        )}&per_side=6`;
        const res = await fetch(url, { signal: ac.signal });
        const data = (await res.json()) as AddressSuggestion[];
        const mapped = data.map((d) => ({
          tekst: d.tekst,
          postnr: d.data?.postnummer?.nr ?? '',
          by: d.data?.postnummer?.navn ?? '',
        }));
        setAddrOpts(mapped);
        if (document.activeElement === inputRef.current) setAddrOpen(true);
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [addrQ]);

  const chooseAddr = (opt: { tekst: string; postnr: string; by: string }) => {
    setAddrQ(opt.tekst);
    const { street, postalCode, city } = parseAddress(opt.tekst);
    touch((c, v) => {
      c.address.street = v;
    })(street);
    touch((c, v) => {
      c.address.postalCode = v;
    })(postalCode || opt.postnr || '');
    touch((c, v) => {
      c.address.city = v;
    })(city || opt.by || '');
    suppressOpenRef.current = true;
    setAddrOpen(false);
    setAddrOpts([]);
    setAddrIdx(-1);
    setTimeout(() => (suppressOpenRef.current = false), 180);
  };

  const onAddressBlur = () => {
    const { street, postalCode, city } = parseAddress(addrQ);
    touch((c, v) => {
      c.address.street = v;
    })(street);
    touch((c, v) => {
      c.address.postalCode = v;
    })(postalCode);
    touch((c, v) => {
      c.address.city = v;
    })(city);
  };

  const validateEmail = (val: string) => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    setEmailErr(ok || !val ? null : 'Ugyldig email');
  };

  const fmtPhone = (raw: string) => {
    const digits = raw.replace(/\D+/g, '').slice(0, 15);
    if (cc === '+45') {
      return digits
        .slice(0, 8)
        .replace(/(\d{2})(\d{0,2})(\d{0,2})(\d{0,2}).*/, (_, a, b, c, d) =>
          [a, b, c, d].filter(Boolean).join(' ')
        );
    }
    return digits;
  };

  const validatePhone = (val: string) => {
    const digits = val.replace(/\D+/g, '');
    const ok = cc === '+45' ? digits.length === 8 : digits.length >= 6;
    setPhoneErr(ok || !val ? null : 'Ugyldigt telefonnummer');
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border border-border card-surface p-3"
        style={{ boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <Field
            icon={<User size={14} />}
            label="Fornavn"
            value={local.firstName}
            onChange={touch((c, v) => {
              c.firstName = v;
            })}
          />
          <Field
            icon={<User size={14} />}
            label="Efternavn"
            value={local.lastName}
            onChange={touch((c, v) => {
              c.lastName = v;
            })}
          />

          {/* Address — single input showing full address */}
          <label className={cn('text-sm lg:col-span-2 relative', addrOpen && 'z-30')}>
            <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
              <MapPin size={14} />
              <span>Adresse</span>
            </div>
            <input
              ref={inputRef}
              className="tahoe-input w-full"
              value={addrQ}
              onChange={(e) => {
                setAddrQ(e.target.value);
                setAddrIdx(-1);
              }}
              onFocus={() => {
                if (!suppressOpenRef.current && addrOpts.length) setAddrOpen(true);
              }}
              onBlur={() => {
                onAddressBlur();
                setTimeout(() => setAddrOpen(false), 120);
              }}
              onKeyDown={(e) => {
                if (!addrOpen || addrOpts.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setAddrIdx((i) => (i + 1) % addrOpts.length);
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setAddrIdx((i) => (i - 1 + addrOpts.length) % addrOpts.length);
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const pick = addrIdx >= 0 ? addrOpts[addrIdx] : addrOpts[0];
                  if (pick) chooseAddr(pick);
                }
                if (e.key === 'Escape') setAddrOpen(false);
              }}
              placeholder="Sankt Ibs Vej 8A, 4000 Roskilde"
              inputMode="search"
              autoComplete="off"
            />

            {addrOpen && addrOpts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-lg border border-border bg-paper shadow-xl">
                <div className="max-h-64 overflow-auto">
                  {addrOpts.map((o, i) => {
                    const active = i === addrIdx;
                    return (
                      <button
                        key={o.tekst + o.postnr}
                        className={cn(
                          'block w-full px-3 py-2 text-left text-sm transition-colors',
                          active ? 'bg-accent/10' : 'hover:bg-surface-2'
                        )}
                        onMouseEnter={() => setAddrIdx(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseAddr(o)}
                        role="option"
                        aria-selected={active}
                      >
                        <div className="font-medium">{o.tekst}</div>
                        <div className="text-xs text-foreground/65">
                          {o.postnr} {o.by}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </label>

          <Field
            icon={<EnvelopeSimple size={14} />}
            label="Email"
            type="email"
            value={local.email || ''}
            onChange={touch((c, value) => {
              c.email = value;
            })}
            onBlur={() => validateEmail(local.email || '')}
            error={emailErr || undefined}
          />

          <label className="text-sm">
            <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
              <Phone size={14} />
              <span>Telefon</span>
            </div>
            <div className="flex gap-2">
              <select
                className="tahoe-input w-[90px]"
                value={cc}
                onChange={(e) => {
                  setCc(e.target.value);
                  validatePhone(local.phoneMobile || '');
                }}
              >
                <option value="+45">🇩🇰 +45</option>
                <option value="+46">🇸🇪 +46</option>
                <option value="+47">🇳🇴 +47</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+49">🇩🇪 +49</option>
              </select>
              <input
                className={cn('tahoe-input flex-1', phoneErr && 'outline-red-500')}
                value={fmtPhone(local.phoneMobile || local.phoneWork || '')}
                onChange={(e) => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D+/g, '');
                  const formatted = fmtPhone(raw);
                  (e.target as HTMLInputElement).value = formatted;
                  touch((c, v) => {
                    c.phoneMobile = v;
                  })(digits);
                }}
                onBlur={(e) => validatePhone(e.currentTarget.value)}
                placeholder="xx xx xx xx"
                inputMode="tel"
              />
            </div>
            {phoneErr && <div className="mt-1 text-xs text-red-600">{phoneErr}</div>}
          </label>
        </div>
      </div>

      {/* Meta & Notes */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div
          className="rounded-xl border border-border card-surface p-3"
          style={{ boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }}
        >
          <div className="mb-1 text-xs text-foreground/65">Bemærkning</div>
          <Textarea
            placeholder="Noter..."
            defaultValue={local.notes || ''}
            onChange={(e) =>
              touch((c, v) => {
                c.notes = v;
              })(e.target.value)
            }
            className="w-full bg-paper"
            rows={6}
          />
        </div>

        <div
          className="rounded-xl border border-border card-surface p-3"
          style={{ boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }}
        >
          <div className="mb-2 text-xs text-foreground/65">Meta</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-foreground/65">Fødselsdag</div>
            <div>{local.birthdate ?? '—'}</div>
            <div className="text-foreground/65">Køn</div>
            <div>{local.gender ?? '—'}</div>
            <div className="text-foreground/65">Saldo</div>
            <div>
              {local.balanceDKK == null ? (
                '—'
              ) : (
                <Badge
                  variant="secondary"
                  className="font-normal"
                  style={{
                    backgroundColor: `hsl(${local.balanceDKK >= 0 ? 150 : 0} 70% 92% / .6)`,
                    color: `hsl(${local.balanceDKK >= 0 ? 150 : 0} 35% 28% / .95)`,
                    border: `1px solid hsl(${local.balanceDKK >= 0 ? 150 : 0} 35% 70% / .45)`,
                  }}
                >
                  {local.balanceDKK.toFixed(2)} kr.
                </Badge>
              )}
            </div>
            <div className="text-foreground/65">Tags</div>
            <div>{(local.tags || []).join(', ') || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  defaultValue,
  onChange,
  onBlur,
  type = 'text',
  className,
  error,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  className?: string;
  error?: string;
}) {
  return (
    <label className={cn('text-sm', className)}>
      <div className="mb-1 text-xs text-foreground/65 flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <input
        type={type}
        className={cn('tahoe-input w-full', error && 'outline-red-500')}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
      />
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}
