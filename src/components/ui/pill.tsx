import { PiX } from "react-icons/pi"

import { cn } from "@/lib/utils"

type PillProps = {
  children: string
  detail?: string
  dot?: string
  title?: string
  onRemove?: () => void
  className?: string
}

export function Pill({ children, detail, dot, title, onRemove, className }: PillProps) {
  return (
    <span
      data-slot="pill"
      title={title}
      className={cn(
        "bg-primary-tint-75 text-ink-450 dark:bg-primary/20 dark:text-ink-100 inline-flex items-center gap-1 rounded-[5px] py-1 pl-2 text-xs leading-none font-medium",
        onRemove ? "pr-1" : "pr-2",
        className
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 flex-none rounded-full" style={{ backgroundColor: dot }} />}
      <span className="max-w-40 truncate">{children}</span>
      {detail && <span className="tabular-nums">{detail}</span>}
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
