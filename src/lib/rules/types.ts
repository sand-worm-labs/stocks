import type { Condition } from "@/lib/strategy/types"

export type Rule = {
  id: number
  label: string
  // What the rule measures, and the line it draws, for a rule that can be read off the portfolio
  kind?: "budget" | "max-weight" | "liquidity" | "approval" | "condition" | "stop-loss" | "take-profit"
  limit?: number
  // For a condition rule: whether it is never or only while the condition is true, and the condition
  mode?: "never" | "only"
  condition?: Condition
  state: "holds" | "broken"
  // Why a rule is broken
  detail?: string
}

export type StrategyRow = { label: string; term?: string; value: string }
