export type Rule = {
  id: number
  label: string
  state: "holds" | "broken"
  // Why a rule is broken
  detail?: string
}

export type StrategyRow = { label: string; term?: string; value: string }
