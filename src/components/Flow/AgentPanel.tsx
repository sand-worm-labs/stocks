import type { ReactNode } from "react"
import { PiSparkle } from "react-icons/pi"

import { AgentComposer } from "./AgentComposer"

type AgentPanelProps = {
  // The owner's brief, in their words
  brief: string
  // What the agent says, and anything it shows under it
  children: ReactNode
}

// The conversation beside a flow screen: the brief, what the agent says, and a box to answer in
export function AgentPanel({ brief, children }: AgentPanelProps) {
  return (
    <aside aria-label="Agent" className="flex flex-col gap-4">
      <p className="bg-inputBg rounded-2xl p-4 text-sm dark:bg-white/5">{brief}</p>
      <div className="flex flex-col gap-3">
        <span className="text-ink-400 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <PiSparkle aria-hidden="true" />
          Sandworm agent
        </span>
        {children}
      </div>
      <AgentComposer className="mt-auto" />
    </aside>
  )
}
