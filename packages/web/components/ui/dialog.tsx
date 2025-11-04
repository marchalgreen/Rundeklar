'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        // ✅ Match calendar overlay exactly
        'fixed inset-0 z-[120] bg-white/5 dark:bg-black/5 backdrop-blur-sm',
        // Same fade animation as alert-dialog
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  );
});

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Override max width if needed; defaults to sm:max-w-[900px] to match editor dialogs */
    maxWidthClassName?: string;
  }
>(function DialogContent(
  { className, children, maxWidthClassName = 'sm:max-w-[900px]', ...props },
  ref,
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        // Allow in-dialog portals (CustomerPicker, etc.)
        data-radix-dialog-content
        className={cn(
          // ✅ Match calendar sheet surface & positioning
          'fixed left-1/2 top-1/2 z-[130] grid w-full -translate-x-1/2 -translate-y-1/2',
          'max-w-lg w-[92vw]',
          maxWidthClassName,
          // Frosted sheet look
          'gap-4 border border-hair bg-white/85 dark:bg-[hsl(var(--surface))]/85 backdrop-blur-md p-6 shadow-lg',
          // ✅ Same “centered fade + zoom” motion as alert-dialog
          'origin-center data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          // Radius identical to editor
          'duration-200 sm:rounded-xl',
          className,
        )}
        {...props}
      >
        {/* Body only — close button comes from ModalShell header */}
        <div className="relative">{children}</div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-[15px] font-medium leading-none text-foreground', className)}
      {...props}
    />
  );
});

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-xs text-muted', className)}
      {...props}
    />
  );
});
