import type { RuleSpec } from "./spec"
import type { StrategyRow } from "@/features/strategies/types/rules.types"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

const LOSS_ROW = "Loss you can live with"

// A strategy has one of each of these; a second would say two things about the same limit, and which one counted would be a guess
const ONE_ONLY: RuleSpec["type"][] = ["budget", "max-weight", "min-liquidity", "approval", "portfolio-stop"]

// The kinds of rule that appear more than once in a list that should have them once
export const repeatedKinds = (rules: RuleSpec[]) =>
  ONE_ONLY.filter((kind) => rules.filter((rule) => rule.type === kind).length > 1)

// What the rows beside the rules say about the loss the person can live with is the portfolio stop, so they are kept the same
function summaryFor(summary: StrategyRow[], rules: RuleSpec[]): StrategyRow[] {
  const stop = rules.find((rule) => rule.type === "portfolio-stop")
  const others = summary.filter(({ label }) => label !== LOSS_ROW)
  if (!stop) return others

  const row = { label: LOSS_ROW, term: "Max drawdown limit", value: `−${Math.round(stop.limit * 100)}%` }
  return [...others.slice(0, 2), row, ...others.slice(2)]
}

// The strategy with these rules in place of the ones it had. What follows from them (the budget, the loss row) follows here too. The research
// is done afterwards, in a notebook, on the rules as they stand when they are confirmed, so nothing else has to be worked out again.
export function withRules(record: StrategyRecord, rules: RuleSpec[]): StrategyRecord {
  const budget = rules.find((rule) => rule.type === "budget")?.amount ?? record.budget
  return {
    ...record,
    rules,
    budget,
    summary: summaryFor(record.summary, rules),
    assumption: "These are the rules as you set them, not as first read from your idea.",
  }
}
