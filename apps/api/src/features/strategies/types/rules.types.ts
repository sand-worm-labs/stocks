import type { Condition } from "./strategy.types"

export type Rule = {
  id: number
  label: string
  kind?:
    | "budget"
    | "max-weight"
    | "liquidity"
    | "approval"
    | "condition"
    | "stop-loss"
    | "take-profit"
    | "portfolio-stop"
  limit?: number
  pause?: number
  mode?: "never" | "only"
  condition?: Condition
  state: "holds" | "broken"
  detail?: string
}

export type StrategyRow = { label: string; term?: string; value: string }
