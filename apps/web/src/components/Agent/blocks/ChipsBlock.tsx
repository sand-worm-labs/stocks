"use client"

import type { AgentBlock } from "@/types/agent"
import { useAgent } from "../AgentContext"

export function ChipsBlock({ block: { label, chips } }: { block: Extract<AgentBlock, { type: "chips" }> }) {
  const { send } = useAgent()

  return (
    <div data-block className="flex flex-col gap-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            data-item
            onClick={() => send(chip)}
            className="border-border hover:border-primary hover:bg-hover-bg dark:border-border-tertiary dark:hover:bg-sidebar-hover rounded-full border px-3 py-1 text-xs transition-[background-color,border-color] duration-200 ease-out"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
