import { PiCheckCircle, PiWarningCircle } from "react-icons/pi"

import { RuleNumber } from "@/components/Rules/RuleNumber"
import { CardRow } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Rule } from "@/types/rules"

export function RulesList({ rules }: { rules: Rule[] }) {
  return (
    <>
      {rules.map(({ id, label, state, detail }) => (
        <CardRow key={id} className="flex items-center gap-3 px-4 py-3 text-sm">
          <RuleNumber>{id}</RuleNumber>
          <span className="flex-1">{label}</span>
          {detail && <span className="text-ink-400 text-xs">{detail}</span>}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              state === "holds" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
            )}
          >
            {state === "holds" ? <PiCheckCircle aria-hidden="true" /> : <PiWarningCircle aria-hidden="true" />}
            {state === "holds" ? "Holds" : "Can't be met"}
          </span>
        </CardRow>
      ))}
    </>
  )
}
