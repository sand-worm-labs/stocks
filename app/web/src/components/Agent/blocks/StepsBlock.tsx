import { PiCheckBold } from "react-icons/pi"

import { RING } from "@/constants/components/agent/blocks/steps-block"
import { cn } from "@/lib/utils"
import type { AgentBlock } from "@/types/agent"

type StepsBlockProps = { block: Extract<AgentBlock, { type: "steps" }> }

export function StepsBlock({ block: { steps } }: StepsBlockProps) {
  return (
    <ol data-block className="border-border-secondary dark:border-border-tertiary rounded-xl border px-3.5 py-1.5">
      {steps.map(({ label, state, note, url }) => (
        <li
          key={label}
          data-item
          data-step-state={state}
          className={cn(
            "border-border-secondary dark:border-border-tertiary flex items-center gap-2.5 border-t py-2 text-[13px] first:border-t-0",
            state === "waiting" && "text-ink-400"
          )}
        >
          <span className="relative flex size-4 flex-none items-center justify-center">
            {state === "waiting" && (
              <span
                aria-hidden="true"
                className="border-border-secondary dark:border-border-tertiary size-3 rounded-full border-2"
              />
            )}
            {state !== "waiting" && (
              <span
                role="img"
                aria-label="Running"
                data-step-spinner
                className={cn(RING, "absolute animate-spin", state === "done" && "motion-reduce:hidden")}
              />
            )}
            {state === "done" && (
              <span
                role="img"
                aria-label="Done"
                data-check
                className="bg-primary absolute flex size-4 items-center justify-center rounded-full text-white"
              >
                <PiCheckBold size={9} aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="flex-1">{label}</span>
          {note && <span className="text-ink-400 text-xs">{note}</span>}
          {state === "done" && url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-400 hover:text-ink-100 text-xs transition-colors"
            >
              notebook ↗
            </a>
          )}
        </li>
      ))}
    </ol>
  )
}
