'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Orb from '@/components/Orb';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

type StartLoginResponse = {
  ok?: boolean;
  error?: string;
};

type SendCodeResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  devCode?: string;
};

type VerifyCodeResponse = {
  ok?: boolean;
  error?: string;
  next?: string;
};

/* =========================================================================
   Page
=========================================================================== */

export default function StoreLogin() {
  const r = useRouter();

  // Phase
  const [phase, setPhase] = React.useState<'creds' | 'mfa'>('creds');

  // Creds
  const [email, setEmail] = React.useState('owner@clairity.demo');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // MFA
  const [code, setCode] = React.useState('');
  const codeRef = React.useRef('');
  const [cooldown, setCooldown] = React.useState(0);
  const [verifying, setVerifying] = React.useState(false);

  // UI
  const [err, setErr] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  // Demo email dialog
  const [demoOpen, setDemoOpen] = React.useState(false);
  const [demoEmail, setDemoEmail] = React.useState('');

  // Avoid the brief WebGL white flash
  const [orbReady, setOrbReady] = React.useState(false);
  React.useEffect(() => {
    const a = requestAnimationFrame(() => {
      const b = requestAnimationFrame(() => setOrbReady(true));
      return () => cancelAnimationFrame(b);
    });
    return () => cancelAnimationFrame(a);
  }, []);

  // MFA cooldown tick
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  /* =========================
     Helpers
  ========================== */
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /* =========================
     API calls
  ========================== */

  async function startLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/store/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ email, password }),
      });
      const j: StartLoginResponse | null = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setErr(j?.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      // Success → move to MFA panel
      setPhase('mfa');
      setLoading(false);

      // DEMO MODE: always ask for recipient email before sending
      if (DEMO_MODE) {
        setDemoEmail('');
        setDemoOpen(true);
        return;
      }

      await autoSendCode();
    } catch {
      setErr('Network error');
      setLoading(false);
    }
  }

  // Accept optional "to" and forward it to the API
  async function autoSendCode(to?: string) {
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch('/api/auth/store/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ channel: 'email', to }),
      });
      const j: SendCodeResponse | null = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setErr(j?.error || 'Kunne ikke sende kode');
        return;
      }
      setInfo(j?.message || 'Kode sendt til din e-mail');
      setCooldown(120);
      if (j?.devCode) setInfo(`DEV kode: ${j.devCode}`);
      requestAnimationFrame(() => window.dispatchEvent(new Event('otp:focus')));
    } catch {
      setErr('Netværksfejl');
    }
  }

  async function verifyCode(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    if (verifying) return;
    const v = codeRef.current;
    if (!/^[0-9]{6}$/.test(v)) {
      setErr('Indtast 6 cifre');
      return;
    }
    setErr(null);
    setInfo(null);
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/store/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ code: v }),
      });
      const j: VerifyCodeResponse | null = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setErr(j?.error || 'Ugyldig kode');
        setVerifying(false);
        requestAnimationFrame(() => window.dispatchEvent(new Event('otp:focus')));
        return;
      }
      r.push(j.next || '/');
    } catch {
      setErr('Netværksfejl');
      setVerifying(false);
    }
  }

  /* =========================
     Render
  ========================== */

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background (blurred photo + blobs + noise) */}
      <BlurryPhotoBackground />
      <OrbBgBlobs />
      <NoiseOverlay />

      <SystemStatusBadge />

      {/* Brand chip */}
      <div
        className="fixed left-4 top-4 z-40 flex items-center gap-2 rounded-xl border
                   border-white/70 bg-white/75 ring-1 ring-white/60 backdrop-blur-xl px-2.5 py-1.5 shadow-sm"
      >
        <Image
          src="/branding/Clairity_purple.svg"
          alt="Clairity"
          width={88}
          height={24}
          className="h-[18px] w-auto object-contain"
          priority
        />
        <span className="text-[12px] text-zinc-600">Store Login</span>
      </div>

      {/* Center stage */}
      <div className="relative z-30 mx-auto grid min-h-screen w-full max-w-[1120px] place-items-center p-6">
        <div className="relative w-full max-w-[520px]">
          {/* Orb behind the card */}
          <div
            className="absolute left-1/2 z-20 pointer-events-none"
            style={{
              width: 'min(92vw, 880px)',
              height: 'min(92vw, 880px)',
              top: '58%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              overflow: 'hidden',
              opacity: orbReady ? 1 : 0,
              transition: 'opacity 220ms cubic-bezier(.22,.7,.2,1)',
              willChange: 'opacity, transform',
              backfaceVisibility: 'hidden',
            }}
            aria-hidden
          >
            <Orb hoverIntensity={0.2} rotateOnHover hue={0} />
          </div>

          <GlassCard>
            {/* Header */}
            <div className="mb-4 text-center">
              <Image
                src="/branding/Clairity_purple.svg"
                alt="Clairity"
                width={420}
                height={96}
                className="mx-auto h-10 w-auto sm:h-12 object-contain"
                priority
              />
              <h1 className="mt-3 text-[18px] font-semibold leading-tight text-zinc-900">
                Store Login
              </h1>
              <p className="mt-1 text-[12px] text-zinc-600">
                {phase === 'creds'
                  ? 'Log ind for at fortsætte'
                  : 'Indtast 6-cifret kode sendt til din e-mail'}
              </p>
            </div>

            {/* Smooth height swap between phases */}
            <AutoHeight mode={phase}>
              {phase === 'creds' ? (
                <form
                  onSubmit={startLogin}
                  className="mx-auto max-w-[440px] space-y-3 text-left"
                  autoComplete="off"
                >
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-zinc-700">Email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                      placeholder="owner@clairity.demo"
                      autoComplete="username"
                      inputMode="email"
                      type="email"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-zinc-700">
                      Password
                    </span>
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(inputCls, 'pr-20')}
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute inset-y-0 right-0 my-1 mr-1 rounded-md border border-white/60 bg-white/70 px-2 text-[12px] text-zinc-700 hover:bg-white"
                        aria-pressed={showPw}
                        tabIndex={-1}
                      >
                        {showPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </label>

                  {err && (
                    <div className="rounded-md border border-rose-200/70 bg-rose-50/80 p-2 text-[12px] text-rose-700">
                      {err}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2',
                      'text-[14px] font-medium text-white shadow transition-all disabled:opacity-60',
                      loading ? 'bg-sky-700' : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
                    )}
                  >
                    {loading ? 'Checking…' : 'Continue'}
                    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
                      <path
                        d="M3 10h12m0 0-4-4m4 4-4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </form>
              ) : (
                <OTPPanel
                  code={code}
                  setCode={(v) => {
                    const only = v.replace(/\D+/g, '').slice(0, 6);
                    setCode(only);
                    codeRef.current = only;
                    if (only.length === 6 && !verifying) {
                      requestAnimationFrame(() => verifyCode());
                    }
                  }}
                  info={info}
                  err={err}
                  verifying={verifying}
                  cooldown={cooldown}
                  onResend={() => cooldown === 0 && autoSendCode()}
                  onBack={() => {
                    setPhase('creds');
                    setCode('');
                    codeRef.current = '';
                    setErr(null);
                    setInfo(null);
                  }}
                />
              )}
            </AutoHeight>

            <p className="mt-4 text-center text-[12px] text-zinc-600">
              Har du brug for hjælp?{' '}
              <a href="/support" className="text-sky-700 hover:underline">
                Support
              </a>
            </p>
          </GlassCard>
        </div>
      </div>

      {/* DEMO MODE: Ask for a real recipient email before sending code */}
      <AlertDialog open={demoOpen} onOpenChange={setDemoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send kode til din e-mail</AlertDialogTitle>
            <AlertDialogDescription>
              Du kører i demo-mode. Indtast din rigtige e-mail, så sender vi login-koden dertil.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-2">
            <label className="mb-1 block text-[12px] font-medium text-zinc-700">E-mail</label>
            <input
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-white/60 ring-1 ring-white/60 bg-white/70 px-3 py-2',
                'text-[14px] text-zinc-800 placeholder:text-zinc-400 outline-none',
                'focus:ring-sky-300/70 focus:border-sky-200/70 hover:bg-white'
              )}
              placeholder="din@email.dk"
              inputMode="email"
              type="email"
              autoFocus
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDemoOpen(false)}>Fortryd</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!isEmail(demoEmail)) {
                  setErr('Indtast en gyldig e-mail');
                  return;
                }
                setDemoOpen(false);
                await autoSendCode(demoEmail); // send to the typed address
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              Send kode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* =========================================================================
   AutoHeight — reuse from employee login
=========================================================================== */
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

/* =========================================================================
   OTP Panel (animated like PinForm)
=========================================================================== */
function OTPPanel({
  code,
  setCode,
  info,
  err,
  verifying,
  cooldown,
  onResend,
  onBack,
}: {
  code: string;
  setCode: (v: string) => void;
  info: string | null;
  err: string | null;
  verifying: boolean;
  cooldown: number;
  onResend: () => void;
  onBack: () => void;
}) {
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Focus OTP when panel shows
  React.useEffect(() => {
    const handler = () => {
      const el =
        document.querySelector<HTMLInputElement>(
          'input[autocomplete="one-time-code"], input[data-otp-input]'
        ) || document.querySelector<HTMLInputElement>('input[type="tel"], input[type="text"]');
      el?.focus();
      el?.select?.();
    };
    window.addEventListener('otp:focus', handler);
    handler();
    return () => window.removeEventListener('otp:focus', handler);
  }, []);

  // simple entrance animation
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

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="space-y-3"
      autoComplete="off"
    >
      <div ref={blockRef}>
        <div className="mb-3 flex items-center gap-3">
          <div className="text-[12px] text-zinc-600">Tjek din e-mail for koden.</div>
          <button
            type="button"
            onClick={onBack}
            className="ml-auto rounded-md border border-white/60 bg-white/70 px-2 py-1 text-[12px] text-zinc-700 transition-opacity hover:bg-white"
          >
            Tilbage
          </button>
        </div>

        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
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
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {(err || info) && (
        <div
          className={cn(
            'rounded-md p-2 text-[12px]',
            err
              ? 'border border-rose-200/70 bg-rose-50/80 text-rose-700'
              : 'border border-emerald-200/70 bg-emerald-50/80 text-emerald-700'
          )}
          role="status"
          aria-live="polite"
        >
          {err ?? info}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={cooldown === 0 ? onResend : undefined}
          disabled={cooldown > 0}
          className={cn(
            'rounded-md border px-3 py-1.5 text-[12px]',
            cooldown > 0
              ? 'border-white/60 bg-white/60 text-zinc-500 opacity-70'
              : 'border-white/60 bg-white/80 text-zinc-700 hover:bg-white'
          )}
        >
          {cooldown > 0 ? `Send igen om ${cooldown}s` : 'Send kode igen'}
        </button>

        <button
          type="submit"
          disabled={verifying || code.length !== 6}
          className={cn(
            'rounded-lg px-3 py-2 text-[13px] font-medium text-white shadow',
            verifying || code.length !== 6
              ? 'bg-sky-700/60 opacity-60'
              : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
          )}
          onClick={(e) => {
            e.preventDefault();
            if (code.length === 6 && !verifying) {
              const ev = new Event('submit', { bubbles: true, cancelable: true });
              (e.currentTarget.form as HTMLFormElement | null)?.dispatchEvent(ev);
            }
          }}
        >
          {verifying ? 'Bekræfter…' : 'Bekræft'}
        </button>
      </div>
    </form>
  );
}

/* =========================================================================
   Visual helpers
=========================================================================== */

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
        'relative rounded-2xl border',
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

function SystemStatusBadge() {
  return (
    <div className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-white/60 backdrop-blur-xl shadow-sm">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      System OK
    </div>
  );
}

/* ---- Backgrounds ---- */

function BlurryPhotoBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0"
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

function OrbBgBlobs() {
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
      new BlobOrb(w * 0.22, h * 0.28, 260, '#60a5fa', 0.22),
      new BlobOrb(w * 0.78, h * 0.22, 300, '#34d399', 0.18),
      new BlobOrb(w * 0.55, h * 0.7, 280, '#f59e0b', 0.16),
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
      className="fixed inset-0 z-10"
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
    this.vx = (Math.random() * 2 - 1) * 10;
    this.vy = (Math.random() * 2 - 1) * 10;
  }
  update(dt: number, w: number, h: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -this.r * 0.5 || this.x > w + this.r * 0.5) this.vx *= -1;
    if (this.y < -this.r * 0.5 || this.y > h + this.r * 0.5) this.vy *= -1;
  }
  draw(ctx: CanvasRenderingContext2D) {
    const g = ctx.createRadialGradient(this.x, this.y, this.r * 0.08, this.x, this.y, this.r);
    g.addColorStop(0, rgba(this.color, this.alpha));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function rgba(hex: string, a = 1) {
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

function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 opacity-[.08] mix-blend-soft-light"
      style={{ backgroundImage: NOISE_SVG, backgroundSize: 'auto' }}
    />
  );
}

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>\
<filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='3' type='fractalNoise'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 .25 0'/></feComponentTransfer></filter>\
<rect width='100%' height='100%' filter='url(%23n)'/>\
</svg>\")";

const inputCls =
  'w-full rounded-lg border border-white/60 ring-1 ring-white/60 bg-white/70 px-3 py-2 ' +
  'text-[14px] text-zinc-800 placeholder:text-zinc-400 ' +
  'outline-none transition-[border,box-shadow,background] ' +
  'focus:ring-sky-300/70 focus:border-sky-200/70 hover:bg-white';
