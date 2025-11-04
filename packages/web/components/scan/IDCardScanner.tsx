// src/components/scan/IDCardScanner.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { cn } from '@/lib/utils/cn';

type AnyCaps = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: number | { min?: number; max?: number };
  focusMode?: string | string[];
};

export type IDCardScannerProps = {
  onScan: (id: string, rawText: string) => void;
  onClose?: () => void;
  className?: string;
  helperText?: string;
  active?: boolean;
  forceStop?: boolean;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function extractNumericId(raw: string): string | null {
  const cpr = raw.match(/\b(\d{6})[-\s]?(\d{4})\b/);
  if (cpr) return `${cpr[1]}-${cpr[2]}`;
  const long = raw.match(/\b\d{8,12}\b/);
  if (long) return long[0];
  const only = raw.replace(/\D+/g, '');
  return only.length >= 6 ? only : null;
}

export default function IDCardScanner({
  onScan,
  onClose,
  className,
  helperText = 'Peg kortets stregkode ind i slotten nederst.',
  active = false,
  forceStop = false,
}: IDCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // engines / loops
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const rafRef = useRef<number | null>(null);
  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ui/device
  const [barcodeOk, setBarcodeOk] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomValue, setZoomValue] = useState<number | null>(null);

  // hit UX
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [standby, setStandby] = useState(false);

  // guards/timers
  const sessionRef = useRef(0);
  const abortRef = useRef(false);
  const lockedRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const IDLE_MS = 30_000;

  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  /* ───────────────── Camera lifecycle ───────────────── */

  async function startCamera() {
    if (cameraActive || standby) return;

    try {
      // prefer rear camera
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const backs = devices.filter(
        (d) => d.kind === 'videoinput' && /back|rear|environment/i.test(d.label),
      );
      const deviceId = backs[0]?.deviceId;

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } },
        audio: false,
      };
      (constraints.video as any) = {
        ...(constraints.video as any),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
        advanced: [
          { focusMode: 'continuous' },
          { exposureCompensation: -0.25 },
          { whiteBalanceMode: 'auto' },
        ],
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (abortRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const video = videoRef.current!;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {}
      setCameraActive(true); // make status correct immediately

      // torch/zoom
      const track = stream.getVideoTracks()?.[0];
      const caps: AnyCaps = (track?.getCapabilities?.() || {}) as AnyCaps;
      setTorchAvailable(!!caps.torch);
      if (caps.zoom != null) {
        setZoomSupported(true);
        const target = 1.6;
        try {
          await (track as any).applyConstraints({ advanced: [{ zoom: target }] });
          setZoomValue(target);
        } catch {}
      }

      lockedRef.current = false;
      if (hasBarcodeDetector) {
        const started = await startNativeDetectorLoop().catch(() => false);
        if (!started) await startZxingFallback();
      } else {
        await startZxingFallback();
      }

      armIdleTimer();
    } catch (e: any) {
      setErr(e?.message || 'Kunne ikke åbne kamera.');
      setCameraActive(false);
    }
  }

  function hardStopDecoders() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
  }

  function hardStopCamera() {
    hardStopDecoders();
    const v = videoRef.current;
    const s = (v?.srcObject as MediaStream | null) || null;
    if (s) s.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setCameraActive(false);
  }

  function armIdleTimer() {
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      if (!lockedRef.current) {
        setStandby(true);
        setCollapsed(true);
        hardStopCamera();
      }
    }, IDLE_MS) as unknown as number;
  }
  function clearIdleTimer() {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  /* ─────────────── React lifecycles ─────────────── */

  useEffect(() => {
    const sid = ++sessionRef.current;
    abortRef.current = false;

    setBarcodeOk(false);
    setSnapshotUrl(null);
    setFlash(false);
    setCollapsed(false);
    setStandby(false);

    if (active && !forceStop) startCamera();

    return () => {
      abortRef.current = true;
      clearIdleTimer();
      hardStopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, forceStop]);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) {
        setStandby(true);
        setCollapsed(true);
        clearIdleTimer();
        hardStopCamera();
      }
    };
    const onPageHide = () => {
      setStandby(true);
      setCollapsed(true);
      clearIdleTimer();
      hardStopCamera();
    };
    const onBeforeUnload = () => {
      hardStopCamera();
    };

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  // keep idle timer fresh on interaction
  useEffect(() => {
    const host = videoRef.current?.parentElement?.parentElement;
    if (!host) return;
    const bump = () => {
      if (cameraActive && !lockedRef.current && !standby) armIdleTimer();
    };
    host.addEventListener('pointerdown', bump);
    host.addEventListener('pointermove', bump);
    return () => {
      host.removeEventListener('pointerdown', bump);
      host.removeEventListener('pointermove', bump);
    };
  }, [cameraActive, standby]);

  /* ─────────────── Native BarcodeDetector ─────────────── */

  function getRoiRect(vw: number, vh: number) {
    const cardW = Math.min(vw * 0.8, 780);
    const cardH = cardW / 1.586;
    const cx = vw / 2,
      cy = vh / 2;
    const cardX = cx - cardW / 2,
      cardY = cy - cardH / 2;

    const left = cardX + cardW * 0.22;
    const right = cardX + cardW * 0.78;
    const top = cardY + cardH * 0.78;
    const bottom = cardY + cardH * 0.89;

    const x = Math.max(0, Math.floor(left));
    const y = Math.max(0, Math.floor(top));
    const w = Math.min(vw - x, Math.floor(right - left));
    const h = Math.min(vh - y, Math.floor(bottom - top));
    return { x, y, w, h };
  }

  async function startNativeDetectorLoop(): Promise<boolean> {
    const BD: any = (window as any).BarcodeDetector;
    if (!BD) return false;

    let formats = ['code_128', 'code_39', 'ean_13', 'ean_8'];
    try {
      // FIX: await the promise and guard with Array.isArray
      const supported = await BD.getSupportedFormats?.();
      if (Array.isArray(supported)) {
        formats = formats.filter((f) => supported.includes(f));
      }
    } catch {
      // ignore — we'll still try with our format list
    }

    let detector: any;
    try {
      detector = new BD({ formats });
    } catch {
      return false; // fail fast to ZXing
    }

    const loop = async () => {
      if (abortRef.current || lockedRef.current || !videoRef.current || standby) return;

      const v = videoRef.current!;
      const vw = v.videoWidth,
        vh = v.videoHeight;
      if (!vw || !vh) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
        const { x, y, w, h } = getRoiRect(vw, vh);
        let cv = roiCanvasRef.current;
        if (!cv) {
          cv = document.createElement('canvas');
          roiCanvasRef.current = cv;
        }
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext('2d', { willReadFrequently: true })!;
        cx.drawImage(v, x, y, w, h, 0, 0, w, h);

        const results = await detector.detect(cv as any);
        if (results?.length) {
          const best = results.reduce(
            (a: any, b: any) => ((b?.rawValue?.length || 0) > (a?.rawValue?.length || 0) ? b : a),
            results[0],
          );
          const raw = String(best?.rawValue || '');
          const id = extractNumericId(raw);
          if (id) {
            handleHit(id, raw);
            return;
          }
        }
      } catch {
        // ignore; continue
      }

      rafRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(loop);
      }, 80) as unknown as number;

      if (cameraActive) armIdleTimer();
    };

    rafRef.current = requestAnimationFrame(loop);
    return true;
  }

  /* ─────────────── ZXing fallback ─────────────── */

  async function startZxingFallback() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ]);

    const reader = new BrowserMultiFormatReader(hints as any);
    readerRef.current = reader;

    const video = videoRef.current!;
    const controls = await reader.decodeFromVideoDevice(undefined, video, (res) => {
      if (abortRef.current || lockedRef.current || standby) return;
      if (res) {
        const raw = res.getText();
        const id = extractNumericId(raw);
        if (id) {
          handleHit(id, raw);
        }
      }
      if (cameraActive) armIdleTimer();
    });

    controlsRef.current = controls;
  }

  /* ─────────────── On hit ─────────────── */

  function handleHit(id: string, raw: string) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setBarcodeOk(true);
    clearIdleTimer();

    const v = videoRef.current!;
    if (v && v.videoWidth && v.videoHeight) {
      const cv = document.createElement('canvas');
      cv.width = v.videoWidth;
      cv.height = v.videoHeight;
      cv.getContext('2d')!.drawImage(v, 0, 0);
      try {
        setSnapshotUrl(cv.toDataURL('image/jpeg', 0.9));
      } catch {}
    }

    setFlash(true);
    if ((navigator as any).vibrate) (navigator as any).vibrate(12);
    try {
      onScan(id, raw);
    } catch {}

    // stop decoding immediately
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    controlsRef.current?.stop();

    // after 1.5s: stop camera + collapse
    window.setTimeout(() => {
      const s = (videoRef.current?.srcObject as MediaStream | null) || null;
      if (s) s.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
      setCollapsed(true);
    }, 1500);
  }

  /* ─────────────── Controls ─────────────── */

  const toggleTorch = async () => {
    try {
      const s = videoRef.current?.srcObject as MediaStream | null;
      const track = s?.getVideoTracks?.()[0];
      const caps: AnyCaps = (track?.getCapabilities?.() || {}) as AnyCaps;
      if (!track || !caps.torch) return;
      const settings: any = track.getSettings?.() || {};
      const next = !settings.torch;
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      armIdleTimer();
    } catch {}
  };

  const applyZoom = async (delta: number) => {
    try {
      const s = videoRef.current?.srcObject as MediaStream | null;
      const track = s?.getVideoTracks?.()[0];
      const caps: AnyCaps = (track?.getCapabilities?.() || {}) as AnyCaps;
      if (!track) return;
      const hasRange =
        typeof caps.zoom === 'object' && caps.zoom !== null && (caps.zoom as any).max !== undefined;
      const max = hasRange ? Number((caps.zoom as any).max) : 2;
      const min = hasRange ? Number((caps.zoom as any).min ?? 1) : 1;
      const settings: any = track.getSettings?.() || {};
      const cur = Number(settings.zoom ?? zoomValue ?? 1);
      const next = clamp(cur + delta, min, max || 2);
      await (track as any).applyConstraints({ advanced: [{ zoom: next }] });
      setZoomValue(next);
      armIdleTimer();
    } catch {}
  };

  /* ─────────────── UI ─────────────── */

  const statusText = !cameraActive
    ? standby
      ? 'Standby'
      : 'Venter på kamera'
    : !barcodeOk
      ? 'Finder stregkode'
      : 'Stregkode læst';

  return (
    <div className={cn('space-y-3', className)}>
      <style jsx>{`
        @keyframes blitzFlash {
          0% {
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          35% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes freezePop {
          0% {
            transform: scale(1.02);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Top HUD */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-foreground/70 truncate">
          {standby ? 'Scanner er på standby for at spare strøm.' : helperText}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
              barcodeOk
                ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/40'
                : 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/40',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                barcodeOk ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            Stregkode
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium bg-zinc-300/30 text-zinc-700 ring-1 ring-zinc-400/40">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            Adresse (off)
          </span>
        </div>
      </div>

      {/* Standby prompt */}
      {standby && (
        <div className="rounded-xl border bg-white/80 p-3 backdrop-blur-sm flex items-center justify-between">
          <div className="text-[13px] text-foreground/80">
            Scanner er sat på standby for at spare batteri og GPU.
          </div>
          <button
            type="button"
            className="tahoe-ghost h-8 px-3 text-[12px]"
            onClick={() => {
              setStandby(false);
              setCollapsed(false);
              startCamera();
            }}
          >
            Start scanner
          </button>
        </div>
      )}

      {/* Camera area */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl ring-1 ring-border bg-black/30 transition-[max-height,opacity] duration-500',
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[520px] opacity-100',
        )}
      >
        {!snapshotUrl ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="block w-full aspect-video max-h-[460px] object-cover bg-[linear-gradient(to_bottom,#111,#333)]"
          />
        ) : (
          <img
            src={snapshotUrl}
            alt="Scanningsbillede"
            className="block w-full aspect-video max-h-[460px] object-cover"
            style={{ animation: 'freezePop 220ms ease-out forwards' }}
          />
        )}

        {/* Overlay (no blur in slot) */}
        {!snapshotUrl && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="relative rounded-[22px]"
              style={{
                width: 'min(80%, 780px)',
                aspectRatio: '1.586 / 1',
                boxShadow: 'inset 0 0 0 2px hsl(46 100% 52%)',
                background:
                  'repeating-linear-gradient(to right, rgba(255,255,255,.03) 0 1px, transparent 1px 22px), repeating-linear-gradient(to bottom, rgba(255,255,255,.03) 0 1px, transparent 1px 22px)',
              }}
            >
              <div
                className="absolute ring-[2px] ring-[hsl(46_100%_52%)] rounded-[18px]"
                style={{
                  left: '6.5%',
                  right: '6.5%',
                  top: '9%',
                  bottom: '29%',
                  background: 'hsla(46,100%,52%,0.08)',
                }}
              />
              <div
                className="absolute rounded-[14px]"
                style={{
                  left: '22%',
                  right: '22%',
                  top: '78%',
                  bottom: '11%',
                  background: 'rgba(0,0,0,.16)',
                  boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.55), 0 12px 28px rgba(0,0,0,.25)',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'repeating-linear-gradient(to right, rgba(255,255,255,.22) 0 1px, transparent 1px 8px)',
                    WebkitMask:
                      'linear-gradient(to right, transparent, black 10%, black 90%, transparent), linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                    mask: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent), linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {flash && (
          <div
            className="pointer-events-none absolute inset-0 bg-white/90"
            style={{ animation: 'blitzFlash 320ms ease-out both' }}
          />
        )}

        {!collapsed && (
          <div className="absolute left-3 right-3 bottom-3">
            <div className="rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/15 px-3 py-1.5 flex items-center justify-between">
              <div className="text-[12px] text-white/85">{statusText}</div>
              <div className="flex items-center gap-2">
                {!barcodeOk && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse bg-white/80" />
                )}
                {barcodeOk && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px]">
                    ✓
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address field (off) */}
      <div className="grid gap-1.5">
        <label className="text-[12px] text-foreground/65">Adresse</label>
        <input
          className="tahoe-input w-full bg-white/60 text-foreground/60"
          readOnly
          value=""
          placeholder="Adresse-scan er midlertidigt deaktiveret"
        />
      </div>

      {/* Controls */}
      <div
        className={cn(
          'flex items-center justify-end gap-2 transition-opacity duration-300',
          (collapsed || standby) && 'opacity-0 pointer-events-none',
        )}
      >
        <button
          type="button"
          className="tahoe-ghost h-8 px-3 text-[12px]"
          onClick={toggleTorch}
          disabled={!torchAvailable}
          title={torchAvailable ? 'Tænd/sluk lommelygte' : 'Lommelygte ikke understøttet'}
        >
          Lommelygte
        </button>
        {zoomSupported && (
          <>
            <button
              type="button"
              className="tahoe-ghost h-8 px-3 text-[12px]"
              onClick={() => applyZoom(-0.25)}
            >
              Zoom −
            </button>
            <button
              type="button"
              className="tahoe-ghost h-8 px-3 text-[12px]"
              onClick={() => applyZoom(+0.25)}
            >
              Zoom +
            </button>
            {zoomValue != null && (
              <span className="text-[12px] text-foreground/60 tabular-nums">
                x{zoomValue.toFixed(2)}
              </span>
            )}
          </>
        )}
        {onClose && (
          <button type="button" className="tahoe-ghost h-8 px-3 text-[12px]" onClick={onClose}>
            Luk
          </button>
        )}
      </div>

      {!cameraActive && !collapsed && !standby && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          {err || 'Kamera ikke aktivt. Tjek tilladelser.'}
        </div>
      )}
    </div>
  );
}
