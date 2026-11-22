import type { AgentBlock } from "@/lib/agent/types"

export function NoteBlock({ block: { label, text } }: { block: Extract<AgentBlock, { type: "note" }> }) {
  return (
    <p data-block className="text-sm leading-6">
      <span className="text-ink-400 font-medium">{label} </span>
      {text}
    </p>
  )
}
