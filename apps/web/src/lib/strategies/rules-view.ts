import { readRules } from "@/lib/rules/readings"
import { ruleOf, specOf } from "@/lib/rules/spec"
import { toPortfolio } from "@/lib/strategies/portfolio"
import type { Stock } from "@/types/markets"
import type { StrategyRecord } from "@/types/store"

// A strategy's rules as its rules page shows them: each in plain words, with the exact setting behind it, and, once the strategy is trading,
// how close it is to each limit as it stands. `isConfirmed` is whether the rules are locked in: before that they are still the person's to look
// over, and after it only a new strategy changes them.
export function rulesView(record: StrategyRecord, stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]) {
  const rules = record.rules.map((spec, i) => ruleOf(spec, i + 1))
  const readings = record.status === "live" ? readRules(toPortfolio(record), rules, stocks) : []

  return {
    id: record.id,
    name: record.name,
    isConfirmed: record.stage !== "rules",
    assumption: record.assumption,
    summary: record.summary,
    rules: rules.map((rule) => {
      const reading = readings.find((found) => found.rule.id === rule.id)
      return {
        id: rule.id,
        label: rule.label,
        setting: specOf(rule),
        standing: reading && { reading: reading.reading, closeness: reading.closeness, isBroken: reading.broken ?? false },
      }
    }),
  }
}
