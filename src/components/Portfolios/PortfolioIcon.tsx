import { iconFor } from "@/lib/portfolios/icon"
import { cn } from "@/lib/utils"

type PortfolioIconProps = { name: string; brief?: string; className?: string; size?: number }

export function PortfolioIcon({ name, brief, className, size = 20 }: PortfolioIconProps) {
  const Icon = iconFor(name, brief)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "border-border-secondary bg-block-surface/80 text-ink-100 dark:border-border-tertiary flex size-10 flex-none items-center justify-center rounded-xl border shadow-sm",
        className
      )}
    >
      <Icon size={size} />
    </span>
  )
}
