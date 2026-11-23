import { PiCheck, PiX } from "react-icons/pi"

import { TONE_TILE_CLASSNAME } from "@/constants/tone"
import type { RuleReading } from "@/lib/rules/readings"
import { explainRule, specOf } from "@/lib/rules/spec"
import { cn } from "@/lib/utils"

// A rule this close to its line is drawn as the one to watch
const WATCH = 0.85

function Headroom({ closeness }: { closeness: number }) {
  return (
    <span className="bg-hover-bg h-1.5 w-40 flex-none overflow-hidden rounded-full dark:bg-white/10">
      <span
        style={{ width: `${Math.min(closeness, 1) * 100}%` }}
        className={cn(
          "animate-grow-x block h-full rounded-full",
          closeness >= 1 ? "bg-red-600" : closeness >= WATCH ? "bg-amber-500" : "bg-emerald-600"
        )}
      />
    </span>
  )
}

// Each rule as a sentence, whether it holds, and where the portfolio stands against it right now
export function RuleReadings({ readings }: { readings: RuleReading[] }) {
  return (
    <ul>
      {readings.map(({ rule, reading, closeness }, i) => {
        const spec = specOf(rule)
        const holds = rule.state === "holds"

        return (
          <li
            key={rule.id}
            style={{ "--index": i } as React.CSSProperties}
            className="animate-fade-up border-border-secondary dark:border-border-tertiary flex gap-3 border-t py-4 first:border-t-0 first:pt-0 last:pb-0"
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-6 flex-none items-center justify-center rounded-full",
                holds ? TONE_TILE_CLASSNAME.positive : TONE_TILE_CLASSNAME.negative
              )}
            >
              {holds ? <PiCheck size={13} /> : <PiX size={13} />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] leading-6 font-medium">{spec ? explainRule(spec) : rule.label}</span>
                <span
                  className={cn(
                    "flex-none text-xs font-medium",
                    holds ? "text-emerald-700 dark:text-emerald-400" : "text-error"
                  )}
                >
                  {holds ? "Holds" : "Broken"}
                </span>
              </div>
              {closeness !== undefined && (
                <div className="text-ink-400 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <Headroom closeness={closeness} />
                  <span>Right now: {reading}</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
