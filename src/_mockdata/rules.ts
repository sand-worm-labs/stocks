import type { Rule, StrategyRow } from "@/lib/rules/types"

export const rulesMockData: Rule[] = [
  { id: 1, label: "Budget 500 USDC", state: "holds" },
  { id: 2, label: "Max 20% in any one stock", state: "holds" },
  { id: 3, label: "Liquidity ≥ $100K on Base", state: "holds" },
  { id: 4, label: "Ask before buying", state: "holds" },
]

// The rules of a brief that can't be met: 8 stocks at 15% need 120% of the money, and few have token supply.
export const unmeetableRulesMockData: Rule[] = [
  rulesMockData[0] as Rule,
  { id: 2, label: "Max 20% in any one stock", state: "holds", detail: "8 × 15% = 120%" },
  { id: 3, label: "Liquidity ≥ $100K on Base", state: "broken", detail: "Can't be met" },
  rulesMockData[3] as Rule,
]

export const strategyMockData: StrategyRow[] = [
  { label: "Goal", value: "Growth" },
  { label: "Horizon", value: "3+ years" },
  { label: "Loss you can live with", term: "Max drawdown limit", value: "−20%" },
  { label: "Include", value: "Robotics" },
  { label: "Benchmark", value: "S&P 500" },
]

export const assumptionMockData =
  "“Robotics” includes big companies with a robotics business, not only pure robotics companies."
