import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        positive: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        negative: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
        warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        info: "bg-link/10 text-link",
        neutral: "bg-inputBg text-ink-400 dark:bg-white/5",
        outline: "border-border dark:border-border-tertiary text-ink-400 rounded-md border border-dashed",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge }
