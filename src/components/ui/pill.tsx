import { PiX } from "react-icons/pi"

import { cn } from "@/lib/utils"

type PillProps = {
  children: string
  // Given, the pill gets a button to take it away
  onRemove?: () => void
  className?: string
}

// A small tag in the web app's reference-pill style: a soft violet fill and a grey label, with a button to remove it.
// There is no icon, because what it names (a theme, a stock) has no kind to tell apart.
export function Pill({ children, onRemove, className }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        "bg-primary-tint-75 text-ink-450 dark:bg-primary/20 dark:text-ink-100 inline-flex items-center gap-1 rounded-[5px] py-1 pl-2 text-xs leading-none font-medium",
        onRemove ? "pr-1" : "pr-2",
        className
      )}
    >
      <span className="max-w-40 truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${children}`}
          onClick={onRemove}
          className="text-ink-300 hover:text-ink-500 hover:bg-input flex size-4 items-center justify-center rounded transition-colors dark:hover:bg-white/10"
        >
          <PiX size={10} aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
