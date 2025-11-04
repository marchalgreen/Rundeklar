'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

type ModalShellProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  /** Title shown in the header */
  title: string;

  /** Optional small line under the title */
  subtitle?: string;

  /** Status dot color (e.g. 'hsl(var(--accent-blue))') */
  dotColor?: string;

  /** Right-aligned header content (e.g. "Scan igen") */
  rightSlot?: React.ReactNode;

  /** Tailwind class to control max width (defaults to sm:max-w-[900px]) */
  maxWidthClassName?: string;

  /** Extra class on DialogContent */
  className?: string;

  children: React.ReactNode;
};

/**
 * Glassy modal shell styled to match IDScanOverlay.
 * - Radix-friendly: DialogContent has exactly one child (motion.div)
 * - Motion: scale 0.96 → 1, 180ms, easing cubic-bezier(.2,.8,.2,1)
 * - Respects reduced-motion automatically via user OS; we keep motion minimal.
 */
export default function ModalShell({
  open,
  onOpenChange,
  title,
  subtitle,
  dotColor = 'hsl(var(--accent-blue))',
  rightSlot,
  maxWidthClassName = 'sm:max-w-[900px]',
  className,
  children,
}: ModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent
            className={cn(
              'z-[130]',
              maxWidthClassName,
              'rounded-2xl border border-hair bg-white/85 dark:bg-[hsl(var(--surface))]/85 backdrop-blur-md',
              'shadow-[0_24px_120px_rgba(0,0,0,.18)] p-4 overflow-hidden',
              className,
            )}
          >
            {/* Single child for Radix: motion wrapper */}
            <motion.div
              key="modal-shell"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <DialogHeader className="mb-1">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,.18)]"
                      style={{ background: dotColor }}
                      aria-hidden
                    />
                    <DialogTitle className="truncate text-[15px] font-medium">{title}</DialogTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    {rightSlot}
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="tahoe-ghost h-8 w-8 grid place-items-center rounded-lg"
                      title="Luk"
                      aria-label="Luk"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {subtitle ? (
                  <DialogDescription className="mt-1 text-xs text-muted truncate">
                    {subtitle}
                  </DialogDescription>
                ) : null}
              </DialogHeader>

              {/* Body */}
              <div className="mt-2">{children}</div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
