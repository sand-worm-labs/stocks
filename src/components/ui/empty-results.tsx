import type { ReactNode } from "react"
import type { IconType } from "react-icons"

import { cn } from "@/lib/utils"

type EmptyResultsProps = { icon: IconType; title: string; hint?: string; action?: ReactNode; className?: string }

// What a list shows when there is nothing in it: an icon, what happened, and what to try
export function EmptyResults({ icon: Icon, title, hint, action, className }: EmptyResultsProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-20 text-center", className)}>
      <Icon size={36} aria-hidden="true" className="text-ink-300 dark:text-ink-400" />
      <p className="text-ink-400 text-sm font-medium">{title}</p>
      {hint && <p className="text-ink-300 text-xs">{hint}</p>}
      {action}
    </div>
  )
}
