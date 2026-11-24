import type { RuleSpec } from "@/lib/rules/spec"
import type { Rule, StrategyRow } from "@/lib/rules/types"

export const rulesMockData: Rule[] = [
  { id: 1, label: "Budget 6,000 USDC", state: "holds", kind: "budget", limit: 6_000 },
  { id: 2, label: "Max 20% in any one stock", state: "holds", kind: "max-weight", limit: 0.2 },
  { id: 3, label: "Liquidity ≥ $100K on Base", state: "holds", kind: "liquidity", limit: 100_000 },
  { id: 4, label: "Ask before buying", state: "holds", kind: "approval" },
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

// What each hand-made strategy is held to, in the terms of its own brief: the rest get theirs worked out from their id
export const rulesByPortfolioMockData: Record<
  string,
  { rules: RuleSpec[]; strategy: StrategyRow[]; assumption: string }
> = {
  "robotics-20": {
    rules: [
      { type: "budget", amount: 6_000 },
      { type: "max-weight", limit: 0.2 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "approval" },
    ],
    strategy: strategyMockData,
    assumption: assumptionMockData,
  },
  "steady-leaders": {
    rules: [
      { type: "budget", amount: 5_000 },
      { type: "max-weight", limit: 0.5 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "portfolio-stop", limit: 0.3, pause: 63 },
    ],
    strategy: [
      { label: "Goal", value: "Growth" },
      { label: "Horizon", value: "3+ years" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "−30%" },
      { label: "Include", value: "9 large US stocks" },
      { label: "Benchmark", value: "S&P 500" },
    ],
    assumption:
      "No take-profit: in the backtest it cut winners and lowered the return per unit of risk, and the rebalance already trims winners back to their share. The exit is one stop on the whole strategy, set at the loss limit: tighter ones sold near the bottom and missed the rebound.",
  },
  "big-tech-35": {
    rules: [
      { type: "budget", amount: 7_000 },
      { type: "max-weight", limit: 0.35 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "approval" },
      { type: "stop-loss", limit: 0.15 },
    ],
    strategy: [
      { label: "Goal", value: "Growth" },
      { label: "Horizon", value: "3+ years" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "−20%" },
      { label: "Include", value: "Big tech" },
      { label: "Benchmark", value: "Nasdaq 100" },
    ],
    assumption: "“Big tech” means the largest US platform and software companies that have a token on Base.",
  },
  "memory-space": {
    rules: [
      { type: "budget", amount: 3_800 },
      { type: "max-weight", limit: 0.4 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "approval" },
      { type: "stop-loss", limit: 0.2 },
      { type: "take-profit", limit: 0.4 },
    ],
    strategy: [
      { label: "Goal", value: "Growth" },
      { label: "Horizon", value: "3 years" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "−25%" },
      { label: "Include", value: "Memory chips and space" },
      { label: "Benchmark", value: "S&P 500" },
    ],
    assumption: "“Space” includes launch and satellite companies, not only the makers of parts for them.",
  },
  "crypto-treasuries": {
    rules: [
      { type: "budget", amount: 2_800 },
      { type: "max-weight", limit: 0.4 },
      { type: "min-liquidity", amount: 50_000 },
      { type: "approval" },
      { type: "stop-loss", limit: 0.25 },
      { type: "take-profit", limit: 0.5 },
    ],
    strategy: [
      { label: "Goal", value: "Growth" },
      { label: "Horizon", value: "1+ year" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "−30%" },
      { label: "Include", value: "Companies that hold crypto" },
      { label: "Benchmark", value: "S&P 500" },
    ],
    assumption: "A company counts when crypto is a large part of what it owns, not a small side bet.",
  },
  "ai-chips-25": {
    rules: [
      { type: "budget", amount: 500 },
      { type: "max-weight", limit: 0.25 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "approval" },
    ],
    strategy: [
      { label: "Goal", value: "Growth" },
      { label: "Horizon", value: "5 years" },
      { label: "Loss you can live with", term: "Max drawdown limit", value: "−20%" },
      { label: "Include", value: "AI chips" },
      { label: "Benchmark", value: "Nasdaq 100" },
    ],
    assumption:
      "You gave no loss limit, so I assumed −20%. “AI chips” means companies that design or make the chips themselves.",
  },
}
