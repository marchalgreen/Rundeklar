'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    {...props}
    className={cn(
      // shape & layout
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
      // neutral (unchecked) track
      'border border-[hsl(var(--line))] bg-[hsl(var(--paper))]',
      // checked track uses your macOS blue
      'data-[state=checked]:bg-[hsl(var(--accent-blue))] data-[state=checked]:border-transparent',
      // disabled
      'disabled:cursor-not-allowed disabled:opacity-50',
      // focus ring that matches the rest of the app
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))] focus-visible:ring-opacity-40 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--paper))]',
      className,
    )}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
        'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-4',
        // tiny bevel for the thumb so it feels “physical”
        'shadow-[0_1px_0_rgba(0,0,0,.06),_inset_0_0_0_1px_rgba(255,255,255,.8)]',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
