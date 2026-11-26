import {
  assumptionMockData,
  rulesByPortfolioMockData,
  strategyMockData,
  unmeetableRulesMockData,
} from "@/_mockdata/rules"
import { pick, seedOf } from "@/lib/seed"
import { getOwnStrategy } from "@/lib/strategies/source"
import type { Portfolio } from "@/types/portfolios"

import type { StrategyRow } from "@/types/rules"
import { ruleOf, type RuleSpec } from "./spec"

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
  const own = await getOwnStrategy(portfolio.id)
  if (own)
    return { rules: own.rules.map((spec, i) => ruleOf(spec, i + 1)), strategy: own.summary, assumption: own.assumption }

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
