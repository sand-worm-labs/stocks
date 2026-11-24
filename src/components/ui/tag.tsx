import type { ReactNode } from "react"

import { type Tone, TONE_DOT_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"
import { tintPillDarkClassName } from "@/styles/interactive"

type TagProps = {
  children: ReactNode
  className?: string
  title?: string
  // A status, as a dot before the text: green for what holds, red for what doesn't
  dot?: Extract<Tone, "positive" | "negative">
}

// The web app's tag, as on its public notebooks: a small mono label on a quiet tint, with squared-off corners
export function Tag({ children, className, title, dot }: TagProps) {
  return (
    <span
      data-slot="tag"
      title={title}
      className={cn(
        "font-body-mono text-ink-400 bg-base-600 inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-[10.5px] leading-[14px] font-normal whitespace-nowrap",
        // In dark mode a tag is a bordered, tinted pill
        tintPillDarkClassName,
        className
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-full", TONE_DOT_CLASSNAME[dot])} />}
      {children}
    </span>
  )
}
