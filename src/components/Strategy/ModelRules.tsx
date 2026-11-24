import { PiCheck, PiX } from "react-icons/pi"

import { TONE_TILE_CLASSNAME } from "@/constants/tone"
import type { RuleReading } from "@/lib/rules/readings"
import { explainRule, specOf } from "@/lib/rules/spec"
import { explainStrategy, termsOf } from "@/lib/strategy/explain"
import type { Strategy } from "@/lib/strategy/types"
import { cn } from "@/lib/utils"

import { LEADS } from "./leads"

const LEAD = "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"
const SHARE = "bg-hover-bg text-ink-100 normal-case tabular-nums dark:bg-white/10"
// The line under every rule
const RULE = "border-border-secondary dark:border-border-tertiary border-b"
const ROW = "flex items-baseline gap-2.5 py-1.5 text-[15px] leading-6"

// The whole model as one list of rules, each starting with a lead word: Never, Only and Always for what it can't do, which come
// first, then If, Then and Otherwise for what it holds. A rule that can be broken says whether it holds. Every rule has a line under it. Nothing here is
// kept; it is all read from the strategy and the readings.
export function ModelRules({ strategy, readings }: { strategy: Strategy; readings: RuleReading[] }) {
  const { steps } = explainStrategy(strategy)
  const terms = termsOf(strategy)
  const broken = readings.some(({ rule }) => rule.state === "broken")

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <ul className="flex flex-col">
          {readings.map(({ rule }) => {
            const spec = specOf(rule)
            const { lead, text } = spec ? explainRule(spec) : { lead: "Always" as const, text: rule.label }
            const holds = rule.state === "holds"

            return (
              <li key={`r${rule.id}`} className={cn(RULE, ROW, "py-3")}>
                <span className={cn(LEAD, LEADS[lead].className)}>{lead}</span>
                <span className="flex-1">{text}</span>
                <span
                  className={cn(
                    "inline-flex flex-none items-center gap-1 text-xs font-medium",
                    holds ? "text-emerald-700 dark:text-emerald-400" : "text-error"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full",
                      holds ? TONE_TILE_CLASSNAME.positive : TONE_TILE_CLASSNAME.negative
                    )}
                  >
                    {holds ? <PiCheck size={10} /> : <PiX size={10} />}
                  </span>
                  {holds ? "Holds" : "Broken"}
                </span>
              </li>
            )
          })}
        </ul>

        <ul className="flex flex-col">
          {steps.map(({ depth, kind, text, share }, i) => {
            const word = kind === "if" ? "If" : kind === "then" ? "Then" : kind === "else" ? "Otherwise" : undefined

            return (
              // The line runs the full width, so the indent is set on what is inside it
              <li key={`s${i}`} className={RULE}>
                <div
                  style={{ marginLeft: depth * 22 }}
                  className={cn(
                    ROW,
                    "py-2.5",
                    depth > 0 && "border-border-secondary dark:border-border-tertiary border-l pl-3.5"
                  )}
                >
                  {word && <span className={cn(LEAD, LEADS[word].className)}>{word}</span>}
                  {share && <span className={cn(LEAD, SHARE)}>{share}</span>}
                  {text && <span className={kind === "split" ? "font-medium" : undefined}>{text}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {broken && <p className="text-error text-sm">A rule is broken, so no orders go out until it holds again.</p>}

      {terms.length > 0 && (
        <div className="bg-hover-bg flex flex-col gap-2 rounded-xl p-4 dark:bg-white/5">
          <h3 className="text-sm font-medium">What the words mean</h3>
          <dl className="flex flex-col gap-1.5">
            {terms.map(({ term, meaning }) => (
              <div key={term} className="text-[13px] leading-5">
                <dt className="inline font-medium">{term}</dt> <dd className="text-ink-400 inline">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
