import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { tintPillDarkClassName } from "@/styles/interactive"

type TagProps = { children: ReactNode; className?: string; title?: string }

// The web app's tag, as on its public notebooks: a small mono label on a quiet tint, with squared-off corners
export function Tag({ children, className, title }: TagProps) {
  return (
    <span
      data-slot="tag"
      title={title}
      className={cn(
        "font-body-mono text-ink-400 bg-base-600 inline-flex items-center rounded-md border border-transparent px-2.5 py-1 text-[10.5px] leading-[14px] font-normal whitespace-nowrap",
        // In dark mode a tag is a bordered, tinted pill
        tintPillDarkClassName,
        className
      )}
    >
      {children}
    </span>
  )
}
