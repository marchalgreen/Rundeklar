'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, ...props }, ref) => {
  return (
    <OTPInput
      ref={ref}
      // put layout classes here
      containerClassName={cn('flex items-center justify-center gap-2', className)}
      // 👇 these are safe to pass on most versions; they end up on the internal input
      autoComplete="one-time-code"
      inputMode="numeric"
      pattern="\d*"
      name="otp-code"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      // never pass unknown prop names like inputProps / inputAttributes
      {...props}
    />
  );
});
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
  )
);
InputOTPGroup.displayName = 'InputOTPGroup';

type OTPSlot = {
  char?: string | null;
  hasFakeCaret?: boolean;
  placeholderChar?: string | null;
  isActive?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;

type SlotProps = React.HTMLAttributes<HTMLDivElement> & { index: number };

const InputOTPSlot = React.forwardRef<HTMLDivElement, SlotProps>(
  ({ index, className, ...props }, ref) => {
    const { slots } = React.useContext(OTPInputContext);
    const slot = slots[index];

    // Hooks must be declared unconditionally at the top level
    const slotRef = React.useRef<HTMLDivElement | null>(null);
    const active = Boolean((slot as OTPSlot | undefined)?.isActive);
    React.useEffect(() => {
      if (!active || !slotRef.current) return;
      slotRef.current.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], {
        duration: 120,
        easing: 'cubic-bezier(.22,.7,.2,1)',
        fill: 'both',
      });
    }, [active]);

    if (!slot) {
      return (
        <div
          ref={ref}
          className={cn(
            'grid h-10 w-10 place-items-center rounded-md border border-white/60 bg-white/70',
            'text-[16px] text-zinc-900 ring-1 ring-white/60'
          )}
          {...props}
        />
      );
    }

    const { char, hasFakeCaret, placeholderChar, isActive, ...rest } = slot as OTPSlot;

    return (
      <div
        ref={(node) => {
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
          slotRef.current = node;
        }}
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-md border bg-white/70',
          'text-[16px] font-medium text-zinc-900 ring-1 ring-white/60 transition',
          'border-white/60',
          active && 'border-sky-300 ring-sky-300 shadow-sm',
          className
        )}
        {...rest}
        {...props}
      >
        <span className={cn(!char && 'opacity-40')}>{char ?? placeholderChar ?? '•'}</span>

        {active && hasFakeCaret && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-2 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-sky-500"
          />
        )}
      </div>
    );
  }
);
InputOTPSlot.displayName = 'InputOTPSlot';

export { InputOTP, InputOTPGroup, InputOTPSlot };
