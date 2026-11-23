import { formatCompactUsd, formatPercent } from "@/lib/format"
import type { Stock } from "@/lib/markets/types"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"

import type { Rule } from "./types"

export type RuleReading = {
  rule: Rule
  // What the portfolio is at, against the rule's line, in words
  reading: string
  // How close to the line: 1 is on it. Missing for a rule with no line to be close to.
  closeness?: number
}

export const maxWeightOf = (rules: Rule[]) => rules.find(({ kind }) => kind === "max-weight")?.limit

// Each rule set against where the portfolio is now, so a rule shows how much room it has, not only that it holds
export function readRules(
  portfolio: Portfolio,
  rules: Rule[],
  stocks: Pick<Stock, "symbol" | "liquidity">[]
): RuleReading[] {
  const total = portfolioValue(portfolio) ?? 0
  const invested = portfolio.holdings.reduce((sum, { cost }) => sum + cost, 0)
  const biggest = portfolio.holdings.toSorted((a, b) => b.value - a.value)[0]
  const held = stocks.filter(
    ({ symbol, liquidity }) =>
      liquidity !== undefined && portfolio.holdings.some((holding) => holding.symbol === symbol)
  )
  const thinnest = held.toSorted((a, b) => (a.liquidity ?? 0) - (b.liquidity ?? 0))[0]
  const thinnestLiquidity = thinnest?.liquidity

  return rules.map((rule) => {
    const { kind, limit } = rule
    if (kind === "budget" && limit) {
      return {
        rule,
        reading: `${invested.toFixed(0)} of ${limit} USDC invested, ${portfolio.cash.toFixed(0)} in cash`,
        closeness: invested / limit,
      }
    }
    if (kind === "max-weight" && limit && biggest && total) {
      const weight = biggest.value / total
      return {
        rule,
        reading: `Biggest is ${biggest.symbol} at ${formatPercent(weight)} of ${formatPercent(limit)}`,
        closeness: weight / limit,
      }
    }
    if (kind === "liquidity" && limit && thinnest && thinnestLiquidity) {
      return {
        rule,
        reading: `Thinnest is ${thinnest.symbol} at ${formatCompactUsd(thinnestLiquidity)}`,
        closeness: limit / thinnestLiquidity,
      }
    }
    if (kind === "approval") return { rule, reading: "Nothing is bought or sold without your OK" }
    return { rule, reading: rule.detail ?? "" }
  })
}
