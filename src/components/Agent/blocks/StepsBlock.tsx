import { PiCheckCircleFill, PiCircle, PiSpinnerGap } from "react-icons/pi"

import type { AgentBlock } from "@/lib/agent/types"
import { cn } from "@/lib/utils"

type StepsBlockProps = { block: Extract<AgentBlock, { type: "steps" }> }

// A tool-call list: what the agent has done, what it is doing and what is left. A finished step shows a spinner until
// the motion ticks it, so the list reads as work happening.
export function StepsBlock({ block: { title, steps } }: StepsBlockProps) {
  const done = steps.filter(({ state }) => state === "done").length

  return (
    <div data-block className="border-border-secondary dark:border-border-tertiary overflow-hidden rounded-xl border">
      <div className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-b px-3 py-2 text-xs">
        <span className="font-medium">{title ?? "Steps"}</span>
        <span className="text-ink-400 tabular-nums">
          {done} of {steps.length}
        </span>
      </div>
      <ol className="flex flex-col py-1">
        {steps.map(({ label, state, note }) => (
          <li
            key={label}
            data-item
            data-step-state={state}
            className={cn("flex items-center gap-2.5 px-3 py-1.5 text-sm", state === "waiting" && "text-ink-400")}
          >
            <span className="relative flex size-4 flex-none items-center justify-center">
              {state === "waiting" && <PiCircle aria-hidden="true" className="text-ink-300" />}
              {state !== "waiting" && (
                <PiSpinnerGap
                  aria-hidden="true"
                  data-step-spinner
                  className={cn("absolute", state === "running" && "text-primary animate-spin")}
                />
              )}
              {state === "done" && (
                <PiCheckCircleFill
                  aria-hidden="true"
                  data-check
                  className="absolute text-emerald-600 dark:text-emerald-400"
                />
              )}
            </span>
            <span className="flex-1">{label}</span>
            {note && <span className="text-ink-400 text-xs">{note}</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}
