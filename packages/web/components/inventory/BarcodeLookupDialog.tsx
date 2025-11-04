'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ModalShell from '@/components/inventory/ModalShell';
import { TabBar } from '@/components/inventory/TabBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResolve: (barcode: string) => void; // external hook if needed
};

export default function BarcodeLookupDialog({ open, onOpenChange, onResolve }: Props) {
  const [tab, setTab] = useState<'scan' | 'manual'>('scan');
  const [value, setValue] = useState('');
  const [usingCam, setUsingCam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number | null>(null);

  // stop detection loop
  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    stopLoop();
    setUsingCam(false);
    try {
      trackRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } finally {
      trackRef.current = null;
      streamRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
    }
  }, [stopLoop]);

  const ensureVideoPlaying = useCallback(async (v: HTMLVideoElement) => {
    await new Promise<void>((resolve) => {
      if (v.readyState >= 1) return resolve();
      const onMeta = () => {
        v.removeEventListener('loadedmetadata', onMeta);
        resolve();
      };
      v.addEventListener('loadedmetadata', onMeta);
    });
    try {
      await v.play();
    } catch {
      setTimeout(() => v.play().catch(() => {}), 100);
    }
  }, []);

  const resolveAndClose = useCallback(
    (code: string) => {
      // Update the search field with a fade-typewriter ghost (shelf listens)
      window.dispatchEvent(new CustomEvent('inventory:search-type', { detail: { value: code } }));
      onResolve(code);
      // Close immediately — let the dialog transition handle the exit
      onOpenChange(false);
      // Camera cleanup is in effect/unmount below
    },
    [onOpenChange, onResolve],
  );

  const startDetectionLoop = useCallback(() => {
    const loop = async () => {
      if (!detectorRef.current || !videoRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes?.length) {
          const raw = String(codes[0].rawValue || '').trim();
          if (raw) {
            resolveAndClose(raw);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [resolveAndClose]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError(null);
    if (!('BarcodeDetector' in window)) {
      setError('BarcodeDetector ikke understøttet i denne browser.');
      setTab('manual');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        torch?: boolean;
      };
      setTorchSupported(!!caps.torch);

      const v = videoRef.current!;
      v.srcObject = stream;
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('autoplay', 'true');

      await ensureVideoPlaying(v);
      setUsingCam(true);

      const BD = (
        window as unknown as {
          BarcodeDetector: new (opts?: BarcodeDetectorOptions) => BarcodeDetector;
        }
      ).BarcodeDetector;
      detectorRef.current = new BD({
        formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
      });

      startDetectionLoop();
    } catch (e) {
      const name = (e as DOMException).name;
      if (name === 'NotAllowedError')
        setError('Kameratilladelse afvist. Tillad via lås-ikonet i browseren.');
      else if (name === 'NotFoundError') setError('Ingen kamera fundet.');
      else if (name === 'NotReadableError') setError('Kamera er i brug af en anden app.');
      else setError('Kunne ikke starte kamera.');
      setTab('manual');
    }
  }, [ensureVideoPlaying, startDetectionLoop, stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track || !torchSupported) return;
    try {
      // @ts-expect-error: torch not typed
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((x) => !x);
    } catch {
      toast.message('Lommelygte ikke tilgængelig på denne enhed.');
    }
  }, [torchOn, torchSupported]);

  useEffect(() => {
    if (open && tab === 'scan') void startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [open, tab, startCamera, stopCamera]);

  const onManualSubmit = useCallback(() => {
    const code = value.trim();
    if (!code) return;
    resolveAndClose(code);
  }, [resolveAndClose, value]);

  const headerRight =
    tab === 'scan' && usingCam ? (
      <button
        type="button"
        className="tahoe-ghost h-8 px-3 text-[12px]"
        onClick={() => {
          stopCamera();
          void startCamera();
        }}
        title="Genstart scanning"
      >
        Scan igen
      </button>
    ) : null;

  return (
    <ModalShell
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(v) : (stopCamera(), onOpenChange(v)))}
      title="Scan stregkode"
      rightSlot={headerRight}
    >
      {/* overlay keyframes for animated scan line */}
      <style jsx>{`
        @keyframes scanLine {
          0% {
            top: 12%;
            opacity: 0.08;
          }
          10% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            top: 88%;
            opacity: 0.08;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan-line {
            animation: none !important;
          }
        }
      `}</style>

      <TabBar
        tabs={[
          { key: 'scan', label: 'Scan' },
          { key: 'manual', label: 'Manuel' },
        ]}
        active={tab}
        onChange={(id: string) => setTab(id as 'scan' | 'manual')}
      />

      {tab === 'scan' && (
        <div className="grid gap-3">
          <div className="relative rounded-2xl overflow-hidden border border-hair bg-black/40 aspect-video">
            <video
              ref={videoRef}
              className="block w-full h-full object-contain"
              playsInline
              muted
              autoPlay
            />

            {/* Rounded frame + animated scan line (subtle) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[8%] rounded-xl"
              style={{ boxShadow: '0 0 0 2px hsl(var(--accent-blue))', opacity: 0.22 }}
            />
            {usingCam && !error && (
              <div
                aria-hidden
                className="scan-line pointer-events-none absolute left-[9%] right-[9%] h-[2px] rounded-full"
                style={{
                  background: 'hsl(var(--accent-blue))',
                  animation: 'scanLine 3.6s cubic-bezier(.2,.8,.2,1) infinite',
                }}
              />
            )}

            {/* helper bar */}
            <div className="absolute left-3 right-3 bottom-3">
              <div className="rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/15 px-3 py-1.5 flex items-center justify-between">
                <div className="text-[12px] text-white/85">
                  {error
                    ? error
                    : usingCam
                      ? 'Peg koden i feltet. Brug lommelygte ved behov.'
                      : 'Kamera inaktiveret.'}
                </div>
                <div className="flex items-center gap-2">
                  {torchSupported && (
                    <Button variant="ghost" size="sm" className="h-7" onClick={toggleTorch}>
                      {torchOn ? 'Sluk lommelygte' : 'Tænd lommelygte'}
                    </Button>
                  )}
                  {!usingCam && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => void startCamera()}
                    >
                      Brug kamera
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {!usingCam && (
              <div className="absolute inset-0 grid place-items-center text-xs text-muted bg-black/30 text-white/70">
                {error ? error : 'Starter kamera…'}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <div className="grid gap-3 rounded-xl border border-border bg-paper p-3">
          <div className="grid gap-1.5">
            <label htmlFor="barcode" className="text-xs text-foreground/65">
              Stregkode
            </label>
            <Input
              id="barcode"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Indtast eller scan…"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onManualSubmit()}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onManualSubmit} disabled={!value.trim()}>
              Find
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuller
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
