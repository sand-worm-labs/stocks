import type { ReactNode } from "react"

import { type Tone, TONE_DOT_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"
import { tintPillDarkClassName } from "@/styles/interactive"

type TagProps = {
  children: ReactNode
  className?: string
  title?: string
  dot?: Extract<Tone, "positive" | "negative">
}

export function Tag({ children, className, title, dot }: TagProps) {
  return (
    <span
      data-slot="tag"
      title={title}
      className={cn(
        "font-body-mono text-ink-400 bg-base-600 inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-[10.5px] leading-[14px] font-normal whitespace-nowrap",
        tintPillDarkClassName,
        className
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-full", TONE_DOT_CLASSNAME[dot])} />}
      {children}
    </span>
  )
}
