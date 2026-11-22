import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import type { AgentBlock } from "@/lib/agent/types"
import { cn } from "@/lib/utils"

export function NoteBlock({ block: { label, text, tone } }: { block: Extract<AgentBlock, { type: "note" }> }) {
  if (tone) {
    return (
      <div
        data-block
        className={cn(
          "flex flex-col gap-1.5 rounded-xl border p-3.5 text-sm leading-6",
          tone === "negative"
            ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/30"
            : "border-hover-border bg-hover-bg dark:bg-white/5"
        )}
      >
        <span className={cn("text-xs font-medium tracking-wide uppercase", TONE_TEXT_CLASSNAME[tone])}>{label}</span>
        {text}
      </div>
    )
  }

  return (
    <p data-block className="text-sm leading-6">
      <span className="text-ink-400 font-medium">{label} </span>
      {text}
    </p>
  )
}
