import { PiCheckCircleFill, PiWarningCircleFill } from "react-icons/pi"

import type { AgentBlock } from "@/lib/agent/types"
import { cn } from "@/lib/utils"

type RulesBlockProps = { block: Extract<AgentBlock, { type: "rules" }> }

export function RulesBlock({ block: { title, note, rules } }: RulesBlockProps) {
  return (
    <div data-block className="border-border-secondary dark:border-border-tertiary overflow-hidden rounded-xl border">
      <div className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-b px-3 py-2 text-xs">
        <span className="font-medium">{title}</span>
        {note && <span className="text-ink-400">{note}</span>}
      </div>
      <ol>
        {rules.map(({ id, label, state, detail }) => (
          <li
            key={id}
            data-item
            className="border-border-secondary dark:border-border-tertiary flex items-center gap-2.5 border-t px-3 py-2 text-sm first:border-t-0"
          >
            <span className="bg-inputBg text-ink-400 flex size-5 flex-none items-center justify-center rounded-full text-[11px] dark:bg-white/10">
              {id}
            </span>
            <span className="flex-1">{label}</span>
            {detail && <span className="text-ink-400 text-xs">{detail}</span>}
            {state === "holds" ? (
              <PiCheckCircleFill
                aria-label="Holds"
                data-check
                className={cn("flex-none text-emerald-600 dark:text-emerald-400")}
              />
            ) : (
              <PiWarningCircleFill
                aria-label="Can't be met"
                data-check
                className="flex-none text-red-600 dark:text-red-400"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
