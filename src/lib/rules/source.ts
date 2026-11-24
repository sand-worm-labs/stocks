import {
  assumptionMockData,
  rulesByPortfolioMockData,
  strategyMockData,
  unmeetableRulesMockData,
} from "@/_mockdata/rules"
import type { Portfolio } from "@/lib/portfolios/types"

import { ruleOf, type RuleSpec } from "./spec"
import type { StrategyRow } from "./types"

// A small number from an id, so the same strategy always gets the same rules but its neighbours get different ones
const seedOf = (id: string) => [...id].reduce((sum, char, i) => (sum + char.charCodeAt(0) * (i + 3)) % 2_147_483_647, 7)
const pick = <T>(options: readonly T[], seed: number, shift: number) => options[(seed >>> shift) % options.length] as T

// The rules of a strategy that wasn't made by hand: the budget covers what it holds, and the rest varies from one to the
// next, so a long list of strategies isn't a long list of the same four rules.
function generatedProfile(portfolio: Portfolio) {
  const seed = seedOf(portfolio.id)
  const live = portfolio.status === "live"
  const spent = portfolio.holdings.reduce((sum, { cost }) => sum + cost, 0) + portfolio.cash
  const rules: RuleSpec[] = [
    { type: "budget", amount: live ? Math.ceil(spent / 500) * 500 : pick([500, 1_000, 2_000, 5_000], seed, 1) },
    { type: "max-weight", limit: live ? pick([0.45, 0.5], seed, 2) : pick([0.25, 0.3, 0.35], seed, 2) },
    { type: "min-liquidity", amount: pick([50_000, 100_000, 100_000], seed, 3) },
  ]
  if (pick([true, true, false], seed, 4)) rules.push({ type: "approval" })
  if (pick([true, false], seed, 5)) rules.push({ type: "stop-loss", limit: pick([0.2, 0.25, 0.3], seed, 6) })
  if (pick([true, false, false], seed, 7)) rules.push({ type: "take-profit", limit: pick([0.3, 0.5], seed, 8) })

  const strategy: StrategyRow[] = [
    { label: "Goal", value: pick(["Growth", "Balanced", "Income"], seed, 9) },
    { label: "Horizon", value: pick(["1+ year", "3+ years", "5+ years"], seed, 10) },
    {
      label: "Loss you can live with",
      term: "Max drawdown limit",
      value: pick(["−10%", "−15%", "−20%", "−25%"], seed, 11),
    },
    { label: "Include", value: portfolio.name },
    { label: "Benchmark", value: pick(["S&P 500", "Nasdaq 100"], seed, 12) },
  ]

  return {
    rules,
    strategy,
    assumption: `“${portfolio.name}” is read as the stocks it names, not every company that touches the theme.`,
  }
}

export async function getRules(portfolio: Portfolio) {
  if (portfolio.status === "unbuildable") {
    return {
      rules: unmeetableRulesMockData,
      strategy: strategyMockData,
      assumption: assumptionMockData,
    }
  }

  const { rules, strategy, assumption } = rulesByPortfolioMockData[portfolio.id] ?? generatedProfile(portfolio)
  return { rules: rules.map((spec, i) => ruleOf(spec, i + 1)), strategy, assumption }
}
