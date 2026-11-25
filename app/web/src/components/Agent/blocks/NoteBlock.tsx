import { TONE_DOT_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"
import type { AgentBlock } from "@/types/agent"

export function NoteBlock({ block: { label, text, tone } }: { block: Extract<AgentBlock, { type: "note" }> }) {
  if (tone) {
    // Colour is only the dot: a tinted box with coloured text reads as an alert banner, and a refusal is a plain answer
    return (
      <div
        data-block
        className="border-border-secondary dark:border-border-tertiary flex flex-col gap-1 rounded-xl border p-3.5 text-sm leading-6"
      >
        <span className="text-ink-400 flex items-center gap-2 text-xs font-medium">
          <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-full", TONE_DOT_CLASSNAME[tone])} />
          {label}
        </span>
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
