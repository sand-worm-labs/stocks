export type Rule = {
  id: number
  label: string
  // What the rule measures, and the line it draws, for a rule that can be read off the portfolio
  kind?: "budget" | "max-weight" | "liquidity" | "approval"
  limit?: number
  state: "holds" | "broken"
  // Why a rule is broken
  detail?: string
}

export type StrategyRow = { label: string; term?: string; value: string }
