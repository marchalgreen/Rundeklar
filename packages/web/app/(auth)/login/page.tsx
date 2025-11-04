// src/app/(auth)/login/page.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Orb from '@/components/Orb';

// confirm modal
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

/* =========================================================
   Utilities
========================================================= */

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
function hexToRGBA(hex: string, a = 1) {
  const m = hex.replace('#', '');
  const n = parseInt(
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m,
    16
  );
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

/* =========================================================
   Auto-height (animated expand/collapse for content under logo)
========================================================= */

function AutoHeight({
  mode,
  children,
  duration = 260,
}: {
  mode: string;
  children: React.ReactNode;
  duration?: number;
}) {
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  const prevH = React.useRef<number>(0);

  React.useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const newH = el.scrollHeight;
    if (!prevH.current) {
      prevH.current = newH;
      el.style.height = 'auto';
      return;
    }

    el.style.height = `${prevH.current}px`;
    el.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.style.transition = `height ${duration}ms cubic-bezier(.22,.7,.2,1)`;
      el.style.height = `${newH}px`;
    });

    const onEnd = () => {
      el.style.height = 'auto';
      el.style.overflow = '';
      el.style.transition = '';
      prevH.current = newH;
    };
    el.addEventListener('transitionend', onEnd, { once: true });
    return () => el.removeEventListener('transitionend', onEnd);
  }, [mode, duration, children]);

  return <div ref={outerRef}>{children}</div>;
}

/* =========================================================
   Employees
========================================================= */

type Employee = { name: string; slug: string };
const EMPLOYEES: Employee[] = [
  { name: 'Søren Nichlas Frid', slug: 'soren-nichlas-frid' },
  { name: 'Lars Madsen', slug: 'lars-madsen' },
  { name: 'Dorthea Nørgaard', slug: 'dorthea-norgaard' },
  { name: 'Michelle Fridahl', slug: 'michelle-fridahl' },
  { name: 'Rasmus Frid Nørgaard', slug: 'rasmus-frid-norgaard' },
  { name: 'Mette Sørensen', slug: 'mette-sorensen' },
];

/* =========================================================
   Page
========================================================= */

export default function LoginPage() {
  const [selected, setSelected] = React.useState<Employee | null>(null);
  const storeName = useStoreName();

  // Focus helper: PinForm listens for this custom event.
  const focusOtp = React.useCallback(() => {
    window.dispatchEvent(new Event('otp:focus'));
  }, []);

  // Selecting an employee (even the same one) should focus OTP
  const handleSelect = React.useCallback(
    (emp: Employee) => {
      setSelected(emp);
      requestAnimationFrame(focusOtp);
    },
    [focusOtp]
  );

  const handleClearSelection = React.useCallback(() => setSelected(null), []);

  // Helper to detect if an event target is inside an editable element
  const isInEditable = (el: EventTarget | null) => {
    const node = el as HTMLElement | null;
    if (!node) return false;
    return !!node.closest('input, textarea, [contenteditable=""], [contenteditable="true"]');
  };

  // Global hotkeys: disabled when typing in any input/textarea/contentEditable
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const inEditable = isInEditable(e.target);
      if (inEditable) return;

      // Map 1..9 / Numpad1..9 to employees
      let digit: number | null = null;
      if (e.key >= '1' && e.key <= '9') digit = Number(e.key);
      else if (/^Numpad[1-9]$/.test(e.code)) digit = Number(e.code.replace('Numpad', ''));

      if (digit != null) {
        const idx = digit - 1;
        if (idx >= 0 && idx < EMPLOYEES.length) {
          e.preventDefault();
          handleSelect(EMPLOYEES[idx]);
        }
        return;
      }

      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && EMPLOYEES.length) {
        e.preventDefault();
        const curIdx = selected ? EMPLOYEES.findIndex((x) => x.slug === selected.slug) : -1;
        const next =
          e.key === 'ArrowRight'
            ? (curIdx + 1 + EMPLOYEES.length) % EMPLOYEES.length
            : (curIdx - 1 + EMPLOYEES.length) % EMPLOYEES.length;
        handleSelect(EMPLOYEES[next]);
        return;
      }

      if (e.key === 'Enter' && selected) {
        e.preventDefault();
        focusOtp();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleSelect, focusOtp]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BlurryPhotoBackground />
      <OrbBackground />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[.08] mix-blend-soft-light"
        style={{ backgroundImage: NOISE_SVG, backgroundSize: 'auto' }}
      />
      <SystemStatusBadge />

      {/* Store menu: logo/name chip + dropdown logout below */}
      <StoreMenu />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1120px] grid-cols-1 items-center gap-8 p-6 sm:grid-cols-2">
        {/* Left: employees & stats */}
        <div className="w-full">
          <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,.35)]">
            Vælg medarbejder
          </h2>
          <EmployeeSelector employees={EMPLOYEES} selected={selected} setSelected={handleSelect} />
          <AmbientStats storeName={storeName} />
        </div>

        {/* Right: glass card */}
        <div className="flex w-full items-center justify-center">
          <GlassCard>
            <LogoOrbCluster storeName={storeName} shrink={!!selected} />

            <AutoHeight mode={selected ? 'pin' : 'logo'}>
              {!selected ? (
                <div className="pt-1 pb-4 text-center text-[12px] text-zinc-600">
                  Vælg medarbejder til venstre for at fortsætte
                </div>
              ) : (
                <PinForm
                  key={selected.slug}
                  employee={selected}
                  onBack={() => setSelected(null)}
                  onEmptyBackspace={handleClearSelection}
                />
              )}
            </AutoHeight>

            <p className="mt-6 text-center text-[12px] text-zinc-600">
              Har du brug for hjælp?{' '}
              <Link href="/support" className="text-sky-700 hover:underline">
                Klik her for support
              </Link>
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Brand / headers
========================================================= */

function useStoreName() {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_STORE_NAME || 'Clairity';
  const host = window.location.host.split(':')[0];
  const sub = host.split('.')[0];
  if (process.env.NEXT_PUBLIC_STORE_NAME) return process.env.NEXT_PUBLIC_STORE_NAME;
  if (sub && sub !== 'localhost' && sub !== 'www')
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  return 'Clairity';
}

/* Single, integrated logo+orb cluster */
function LogoOrbCluster({ storeName, shrink }: { storeName: string; shrink: boolean }) {
  const size = shrink ? 120 : 160;
  return (
    <div
      className="relative mx-auto flex flex-col items-center justify-center transition-all duration-300 ease-[cubic-bezier(.22,.7,.2,1)]"
      style={{ transform: shrink ? 'translateY(-6px) scale(.95)' : 'translateY(0) scale(1)' }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <Orb hoverIntensity={shrink ? 0.35 : 0.5} rotateOnHover hue={0} />
        <Image
          src="/branding/Clairity_purple.svg"
          alt="Clairity"
          width={Math.round(size * 0.65)}
          height={Math.round(size * 0.22)}
          className="pointer-events-none absolute inset-0 m-auto object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,.25)]"
          priority
        />
      </div>
      <p className="mt-3 text-[13px] text-zinc-700">
        Velkommen tilbage til <span className="font-medium text-sky-700">{storeName}</span>
      </p>
    </div>
  );
}

/* =========================================================
   Store Menu (logo/name chip + dropdown under it)
========================================================= */

function StoreMenu() {
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // Click outside closes
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node | null;
      if (wrapRef.current && t && !wrapRef.current.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Escape closes
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
    } catch {}
    window.location.assign('/store/login');
  };

  return (
    <div ref={wrapRef} className="fixed left-4 top-4 z-20">
      {/* Chip */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border',
          'border-white/70 bg-white/75 ring-1 ring-white/60 backdrop-blur-xl',
          'px-3.5 py-2.5 shadow-sm transition-all duration-200 ease-[cubic-bezier(.22,.7,.2,1)]',
          open ? 'ring-sky-300/70 border-sky-200/70' : 'hover:bg-white'
        )}
        aria-pressed={open}
        style={{ animation: 'fade-in .18s ease-out both' }}
      >
        <Image
          src="/branding/stores/nytsyn.png"
          alt="NySyn"
          width={28}
          height={28}
          className="h-7 w-7 rounded-[8px] object-contain"
          priority
        />
        <span className="text-[15px] font-semibold text-zinc-800 leading-none">Roskilde</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={cn(
            'ml-1 h-4 w-4 transition-transform duration-200',
            open ? 'rotate-180' : 'rotate-0'
          )}
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500"
          />
        </svg>
      </button>

      {/* Dropdown under chip */}
      <div
        className={cn(
          'mt-2 origin-top-left rounded-xl border ring-1 backdrop-blur-xl shadow-md',
          'border-white/70 ring-white/60 bg-white/80',
          'transition-all duration-200 ease-[cubic-bezier(.22,.7,.2,1)]',
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-1 scale-[.98]'
        )}
        style={{ minWidth: 160 }}
        aria-hidden={!open}
      >
        <div className="p-2">
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-[13px] text-zinc-700',
                  'bg-white/80 hover:bg-white ring-1 ring-white/60'
                )}
              >
                Log ud
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log ud?</AlertDialogTitle>
                <AlertDialogDescription>
                  Du vil blive logget ud af butikken og medarbejdersessionen. Du kan logge ind igen
                  fra “Store Login”.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDialogOpen(false)}>Fortryd</AlertDialogCancel>
                <AlertDialogAction
                  onClick={doLogout}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {loggingOut ? 'Logger ud…' : 'Log ud'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-2px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

/* =========================================================
   Left: Employees (staggered entrance)
========================================================= */

function EmployeeSelector({
  employees,
  selected,
  setSelected,
}: {
  employees: Employee[];
  selected: Employee | null;
  setSelected: (e: Employee) => void;
}) {
  React.useEffect(() => {
    const wrap = document.querySelector('[data-emp-grid]') as HTMLElement | null;
    if (!wrap) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    const items = Array.from(wrap.querySelectorAll<HTMLElement>('[data-emp-item]'));
    items.forEach((el, i) => {
      el.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 260,
          easing: 'cubic-bezier(.22,.7,.2,1)',
          delay: Math.min(i * 70, 420),
          fill: 'both',
        }
      );
    });
  }, []);

  return (
    <div className="grid grid-cols-3 gap-3" data-emp-grid>
      {employees.map((emp, i) => (
        <EmployeeTile
          key={emp.slug}
          emp={emp}
          index={i}
          active={selected?.slug === emp.slug}
          onSelect={() => setSelected(emp)}
        />
      ))}
    </div>
  );
}

function EmployeeTile({
  emp,
  index,
  active,
  onSelect,
}: {
  emp: Employee;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const src = `/employees/${emp.slug}.png`;
  const [showInitials, setShowInitials] = React.useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-emp-item
      className={cn(
        'group relative grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2',
        'rounded-2xl border ring-1 backdrop-blur-md',
        'border-white/55 ring-white/55',
        'bg-[linear-gradient(180deg,rgba(255,255,255,.50),rgba(255,255,255,.36))]',
        'shadow-[0_18px_40px_rgba(0,0,0,.12)]',
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl before:content-[''] before:bg-[linear-gradient(to_right,transparent,rgba(255,255,255,.85),transparent)]",
        'transition-all duration-200 ease-[cubic-bezier(.22,.7,.2,1)]',
        'hover:-translate-y-px hover:bg-white/50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70',
        active && 'ring-sky-300/70 border-sky-200/70'
      )}
      title={emp.name}
      style={{ opacity: 0, transform: 'translateY(8px)' }}
    >
      {/* Hotkey number hint */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-1.5 top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full',
          'bg-black/25 text-white text-[10px] font-semibold ring-1 ring-white/30 backdrop-blur-sm',
          'opacity-70 transition-opacity duration-150 group-hover:opacity-100',
          active && 'hidden'
        )}
        title={`Genvej: ${index + 1}`}
      >
        {index + 1}
      </span>

      {/* Avatar */}
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-sky-300/60">
        {!showInitials ? (
          <Image
            src={src}
            alt={emp.name}
            fill
            sizes="48px"
            className="rounded-full object-cover object-top"
            onError={() => setShowInitials(true)}
          />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full bg-sky-500/20 text-[14px] font-semibold text-sky-700">
            {initials(emp.name)}
          </span>
        )}
      </span>

      {/* Name */}
      <span
        className={cn(
          'block text-left text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]',
          'text-[13.5px] font-medium leading-tight',
          'line-clamp-2',
          'pr-8'
        )}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {emp.name}
      </span>

      {/* Active badge */}
      <span
        className={cn(
          'pointer-events-none absolute -right-1 -top-1 grid h-6 min-w-[26px] place-items-center rounded-full bg-sky-600 px-[8px] text-[11.5px] font-semibold text-white shadow-inner',
          'transition-opacity duration-200',
          active ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden={!active}
      >
        PIN
      </span>

      <span className="absolute inset-0 rounded-2xl ring-0 transition-[box-shadow] duration-150 group-active:shadow-inner group-active:shadow-black/10" />
    </button>
  );
}

/* =========================================================
   Right column: Glass Card (parallax lighting)
========================================================= */

function GlassCard({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const focusCount = React.useRef(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onFocus = () => (focusCount.current += 1);
    const onBlur = () => (focusCount.current = Math.max(0, focusCount.current - 1));
    window.addEventListener('focusin', onFocus);
    window.addEventListener('focusout', onBlur);

    const onMove = (e: MouseEvent) => {
      if (focusCount.current > 0) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      el.style.transform = `perspective(900px) rotateX(${dy * -3}deg) rotateY(${
        dx * 4
      }deg) translateZ(0)`;
    };
    const onLeave = () => {
      el.style.transform = 'none';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('focusin', onFocus);
      window.removeEventListener('focusout', onBlur);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'relative w-full max-w-[460px] rounded-2xl border transition-transform',
        'border-white/60 bg-white/55 ring-1 ring-white/60',
        'shadow-[0_28px_80px_rgba(0,0,0,.18),_0_8px_24px_rgba(0,0,0,.10)]',
        'backdrop-blur-2xl'
      )}
      style={{
        backgroundImage:
          'linear-gradient(to bottom, rgba(255,255,255,.86), rgba(255,255,255,.62)),' +
          'radial-gradient(120% 160% at 60% -20%, rgba(59,130,246,.10), transparent 60%)',
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(255,255,255,.95),transparent)]" />
      <div className="p-6 sm:p-8">{children}</div>
    </div>
  );
}

/* =========================================================
   PIN form (focus, auto-submit on 4 digits, backspace-to-deselect)
========================================================= */

function PinForm({
  employee,
  onBack,
  onEmptyBackspace,
}: {
  employee: Employee;
  onBack: () => void;
  onEmptyBackspace: () => void;
}) {
  const [pin, setPin] = React.useState('');
  const pinRef = React.useRef(''); // latest value for submit timing
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement | null>(null);

  const focusOtp = React.useCallback(() => {
    const el =
      document.querySelector<HTMLInputElement>(
        'input[autocomplete="one-time-code"], input[data-otp-input]'
      ) || document.querySelector<HTMLInputElement>('input[type="tel"], input[type="text"]');
    el?.focus();
    el?.select?.();
  }, []);

  React.useEffect(() => {
    setPin('');
    pinRef.current = '';
    setMsg(null);
    focusOtp();
  }, [employee.slug, focusOtp]);

  React.useEffect(() => {
    const handler = () => focusOtp();
    window.addEventListener('otp:focus', handler);
    return () => window.removeEventListener('otp:focus', handler);
  }, [focusOtp]);

  const blockRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    blockRef.current?.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'both' }
    );
  }, []);

  const headRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 180,
      easing: 'ease-out',
      fill: 'both',
    });
  }, [employee.slug]);

  const shake = () =>
    blockRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 260, easing: 'cubic-bezier(.36,.07,.19,.97)' }
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const current = pinRef.current;
    if (current.length !== 4) {
      setMsg('Indtast 4 cifre.');
      shake();
      return;
    }
    setMsg(null);
    setLoading(true);

    const res = await fetch('/api/auth/employee/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeSlug: employee.slug, pin: current }),
    });
    const j = await res.json();

    if (!res.ok) {
      setLoading(false);
      setMsg(j.error === 'invalid_pin' ? 'Forkert PIN. Prøv igen.' : 'Kunne ikke logge ind.');
      setPin('');
      pinRef.current = '';
      shake();
      requestAnimationFrame(focusOtp);
      return;
    }

    setMsg('PIN verificeret — logger ind …');
    setOk(true);
    window.dispatchEvent(new Event('emp:transition:login'));
    await new Promise((r) => setTimeout(r, 300));
    window.location.assign(j.next || '/');
  }

  // Backspace on empty → deselect employee
  const onKeyDownCapture = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Backspace' && pinRef.current.length === 0) {
      e.preventDefault();
      onEmptyBackspace();
    }
  };

  // Auto-submit when 4 digits typed
  const handleOtpChange = (v: string) => {
    const onlyDigits = v.replace(/\D+/g, '');
    setPin(onlyDigits);
    pinRef.current = onlyDigits;
    if (onlyDigits.length === 4 && !loading) {
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onKeyDownCapture={onKeyDownCapture}
      className="space-y-3"
      autoComplete="off"
    >
      <div ref={blockRef}>
        {/* Header row — crossfades on change */}
        <div ref={headRef} className="mb-3 flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 rounded-full ring-2 ring-sky-300/60">
            <Image
              key={employee.slug}
              src={`/employees/${employee.slug}.png`}
              alt={employee.name}
              fill
              sizes="56px"
              className="rounded-full object-cover object-top"
            />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-zinc-900">{employee.name}</div>
            <div className="text-[12px] text-zinc-600">Indtast 4-cifret PIN for at logge ind</div>
            <div className="text-[11px] text-zinc-400/90">Demo: 1111</div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="ml-auto rounded-md border border-white/60 bg-white/70 px-2 py-1 text-[12px] text-zinc-700 transition-opacity hover:bg-white"
          >
            Tilbage
          </button>
        </div>

        <InputOTP
          maxLength={4}
          value={pin}
          onChange={handleOtpChange}
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="\d*"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {msg && (
        <div
          className="rounded-md border border-white/60 bg-white/70 p-2 text-[12px] text-zinc-700"
          role="status"
          aria-live="polite"
        >
          {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || pinRef.current.length !== 4}
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium text-white shadow transition-colors disabled:opacity-60',
          ok
            ? 'bg-emerald-600 hover:bg-emerald-600 ring-2 ring-emerald-200'
            : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
        )}
      >
        {loading ? 'Logger ind …' : 'Bekræft PIN'} <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

/* =========================================================
   System status + ambient stats
========================================================= */

function SystemStatusBadge() {
  return (
    <div className="fixed right-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-white/60 backdrop-blur-xl shadow-sm">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      System OK
    </div>
  );
}

function AmbientStats({ storeName: _storeName }: { storeName: string }) {
  const stats = [
    { k: 'Bookinger i dag', v: 5 },
    { k: 'Ordrer klar', v: 2 },
    { k: 'Kalibreringsadvarsler', v: 1 },
  ];
  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.k}
          className={cn(
            'relative rounded-2xl border px-3 py-2 ring-1 backdrop-blur-lg',
            'border-white/45 ring-white/45',
            'bg-[linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.18))]',
            'shadow-[0_14px_34px_rgba(0,0,0,.10)]',
            "before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl before:content-[''] before:bg-[linear-gradient(to_right,transparent,rgba(255,255,255,.70),transparent)]"
          )}
        >
          <div className="flex items-center gap-2 text-[12.5px] text-white/92 drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]">
            <span className="text-[14px]">∿</span>
            {s.k}
          </div>
          <div className="mt-1 text-[20px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]">
            {s.v}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   Backgrounds
========================================================= */

function BlurryPhotoBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-20"
      style={{
        backgroundImage: 'url(/backgrounds/optician.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(36px) saturate(120%) brightness(1.02)',
        transform: 'scale(1.05)',
      }}
    />
  );
}

function OrbBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth),
      h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const blobs = [
      new BlobOrb(w * 0.25, h * 0.32, 220, '#60a5fa', 0.24),
      new BlobOrb(w * 0.72, h * 0.24, 260, '#34d399', 0.2),
      new BlobOrb(w * 0.55, h * 0.66, 240, '#f59e0b', 0.18),
    ];

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      blobs.forEach((b) => {
        b.update(1 / 60, w, h);
        b.draw(ctx);
      });
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(render);
    };
    render();

    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ filter: 'blur(40px) saturate(140%)', transform: 'translateZ(0)' }}
      aria-hidden
    />
  );
}

class BlobOrb {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
  constructor(x: number, y: number, r: number, color: string, alpha = 0.22) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
    this.alpha = alpha;
    this.vx = (Math.random() * 2 - 1) * 12;
    this.vy = (Math.random() * 2 - 1) * 12;
  }
  update(dt: number, w: number, h: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -this.r * 0.5 || this.x > w + this.r * 0.5) this.vx *= -1;
    if (this.y < -this.r * 0.5 || this.y > h + this.r * 0.5) this.vy *= -1;
  }
  draw(ctx: CanvasRenderingContext2D) {
    const g = ctx.createRadialGradient(this.x, this.y, this.r * 0.08, this.x, this.y, this.r);
    g.addColorStop(0, hexToRGBA(this.color, this.alpha));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* =========================================================
   Assets
========================================================= */

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>\
<filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='3' type='fractalNoise'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 .25 0'/></feComponentTransfer></filter>\
<rect width='100%' height='100%' filter='url(%23n)'/>\
</svg>\")";
