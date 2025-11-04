import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-700 shadow hover:bg-emerald-500/20 dark:text-emerald-300",
        muted:
          "border-transparent bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] backdrop-blur-sm",
        outline: "text-foreground",
        ok: "border-transparent bg-[hsl(var(--svc-check))]/15 text-[hsl(var(--svc-check))] backdrop-blur-sm",
        warn: "border-transparent bg-[hsl(var(--svc-pickup))]/18 text-[hsl(var(--svc-pickup))] backdrop-blur-sm",
        danger:
          "border-transparent bg-[hsl(var(--svc-repair))]/18 text-[hsl(var(--svc-repair))] backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
