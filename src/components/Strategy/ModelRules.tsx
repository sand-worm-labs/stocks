import { type ReactNode, useState } from "react"
import { PiCaretDown } from "react-icons/pi"

import { isExit, type RuleReading } from "@/lib/rules/readings"
import { explainStrategy, termsOf } from "@/lib/strategy/explain"
import { cn } from "@/lib/utils"
import type { Strategy } from "@/types/strategy"

import { RuleLine, StepLine } from "./RuleLines"

function Fold({
  title,
  count,
  open: startOpen = true,
  tour,
  children,
}: {
  title: string
  count?: number
  open?: boolean
  tour?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(startOpen)

  return (
    <section data-tour={tour} className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="border-border-secondary dark:border-border-tertiary hover:text-ink-100 text-ink-400 flex items-center gap-2 border-b py-2 text-left text-xs font-medium tracking-wide uppercase transition-colors"
      >
        <PiCaretDown
          aria-hidden="true"
          size={12}
          className={cn("flex-none transition-transform", !open && "-rotate-90")}
        />
        {title}
        {count !== undefined && (
          <span className="bg-hover-bg rounded-full px-1.5 normal-case tabular-nums dark:bg-white/10">{count}</span>
        )}
      </button>
      {open && children}
    </section>
  )
}

export function ModelRules({ strategy, readings }: { strategy: Strategy; readings: RuleReading[] }) {
  const { steps } = explainStrategy(strategy)
  const terms = termsOf(strategy)
  const broken = readings.some((reading) => !isExit(reading) && reading.rule.state === "broken")

  const exits = readings.filter(isExit)
  const others = readings.filter((reading) => !isExit(reading))
  const [first] = steps
  const lifted = first?.kind === "keep" && first.depth === 0 ? first : undefined
  const decides = lifted ? steps.slice(1).map((step) => ({ ...step, depth: Math.max(step.depth - 1, 0) })) : steps

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {exits.length > 0 && (
          <Fold title="Exits" count={exits.length}>
            <ul className="flex flex-col">
              {exits.map(({ rule }) => (
                <RuleLine key={rule.id} rule={rule} />
              ))}
            </ul>
          </Fold>
        )}

        {lifted && (
          <Fold title="Rebalance">
            <ul className="flex flex-col">
              <StepLine step={lifted} standalone />
            </ul>
          </Fold>
        )}

        {others.length > 0 && (
          <Fold title="Limits" count={others.length} tour="rules-limits">
            <ul className="flex flex-col">
              {others.map(({ rule }) => (
                <RuleLine key={rule.id} rule={rule} />
              ))}
            </ul>
          </Fold>
        )}

        {decides.length > 0 && (
          <Fold title="What it decides" count={decides.length}>
            <ul className="flex flex-col">
              {decides.map((step, i) => (
                <StepLine key={i} step={step} />
              ))}
            </ul>
          </Fold>
        )}
      </div>

      {broken && <p className="text-error text-sm">A rule is broken, so no orders go out until it holds again.</p>}

      {terms.length > 0 && (
        <Fold title="What the words mean" count={terms.length} open={false}>
          <dl className="bg-hover-bg mt-3 flex flex-col gap-1.5 rounded-xl p-4 dark:bg-white/5">
            {terms.map(({ term, meaning }) => (
              <div key={term} className="text-[13px] leading-5">
                <dt className="inline font-medium">{term}</dt> <dd className="text-ink-400 inline">{meaning}</dd>
              </div>
            ))}
          </dl>
        </Fold>
      )}
    </div>
  )
}
