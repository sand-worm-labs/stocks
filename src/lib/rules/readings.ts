import { formatCompactUsd, formatPercent } from "@/lib/format"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import { holds } from "@/lib/strategy/evaluate"
import type { Stock } from "@/types/markets"
import type { Portfolio } from "@/types/portfolios"

import type { Rule } from "@/types/rules"
import type { Condition, History } from "@/types/strategy"

export type RuleReading = {
  rule: Rule
  reading: string
  // How close to the line: 1 is on it. Missing for a rule with no line to be close to.
  closeness?: number
  broken?: boolean
}

const symbolsIn = (condition: Condition): string[] =>
  "all" in condition
    ? condition.all.flatMap(symbolsIn)
    : "any" in condition
      ? condition.any.flatMap(symbolsIn)
      : [condition.left.symbol, ...("symbol" in condition.right ? [condition.right.symbol] : [])]

// Whether a condition is true as of the latest day, from each stock's own prices lined up at their ends. Missing when there
// are no prices yet for a stock it reads.
function conditionNow(condition: Condition, stocks: Pick<Stock, "symbol" | "series">[]): boolean | undefined {
  const symbols = [...new Set(symbolsIn(condition))]
  const series = symbols.map((symbol) => stocks.find((stock) => stock.symbol === symbol)?.series)
  if (series.some((one) => !one?.length)) return undefined
  const length = Math.min(...series.map((one) => one?.length ?? 0))
  const history: History = Object.fromEntries(symbols.map((symbol, i) => [symbol, (series[i] ?? []).slice(-length)]))
  return holds(condition, history, length - 1)
}

// How a portfolio gets out of a stock, which every list of rules puts first
// An exit is watched on its own and acts by selling; it never holds a trade back, so it is not one of the rules a trade is checked against
export const isExitRule = ({ kind }: Rule) =>
  kind === "stop-loss" || kind === "take-profit" || kind === "portfolio-stop"
export const isExit = ({ rule }: RuleReading) => isExitRule(rule)

export const exitsFirst = (readings: RuleReading[]) => [
  ...readings.filter(isExit),
  ...readings.filter((r) => !isExit(r)),
]

export const maxWeightOf = (rules: Rule[]) => rules.find(({ kind }) => kind === "max-weight")?.limit

export function readRules(
  portfolio: Portfolio,
  rules: Rule[],
  stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]
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
    if ((kind === "stop-loss" || kind === "take-profit") && limit) {
      const made = portfolio.holdings
        .filter(({ cost }) => cost > 0)
        .map(({ symbol, value, cost }) => ({ symbol, change: value / cost - 1 }))
        .toSorted((a, b) => (kind === "stop-loss" ? a.change - b.change : b.change - a.change))[0]
      if (!made) return { rule, reading: "There is nothing held yet to check this against" }
      const closeness = kind === "stop-loss" ? Math.max(-made.change, 0) / limit : Math.max(made.change, 0) / limit
      return {
        rule,
        reading: `${kind === "stop-loss" ? "Worst" : "Best"} is ${made.symbol} at ${formatPercent(made.change, { signed: true })}`,
        closeness: closeness >= 1 ? 1.001 : closeness,
      }
    }
    if (kind === "portfolio-stop" && limit) {
      const series = portfolio.series.filter((value) => value > 0)
      if (series.length < 2) return { rule, reading: "There is no history yet to check this against" }
      const fall = (series.at(-1) ?? 0) / Math.max(...series) - 1
      return {
        rule,
        reading: fall === 0 ? "At its high" : `${formatPercent(-fall)} below its high`,
        closeness: Math.max(-fall, 0) / limit,
      }
    }
    if (kind === "condition" && rule.condition && rule.mode) {
      const met = conditionNow(rule.condition, stocks)
      if (met === undefined) return { rule, reading: "There are no prices yet to check this against" }
      return {
        rule,
        reading: met ? "It is true right now" : "It is not true right now",
        broken: rule.mode === "never" ? met : !met,
      }
    }
    if (kind === "approval") return { rule, reading: "Nothing is bought or sold without your OK" }
    return { rule, reading: rule.detail ?? "" }
  })
}
