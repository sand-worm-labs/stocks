import { formatDay, formatTime } from "@/lib/dates"

import { portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

export type ValuePoint = { label: string; value: number; benchmark: number }

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// A series moved and stretched so it starts at one value and ends at another
function between(series: number[], first: number, last: number) {
  const start = series[0] ?? 0
  const span = (series.at(-1) ?? start) - start || 1
  return series.map((value) => first + ((value - start) * (last - first)) / span)
}

// How far back the portfolio's numbers go: a week, or less if it was bought more recently
export function holdPeriod({ startedAt }: Portfolio, now: string) {
  const since = startedAt ? new Date(startedAt).getTime() : 0
  const end = new Date(now).getTime()
  const start = Math.max(end - WEEK_MS, since)
  return {
    start,
    end,
    shortened: start > end - WEEK_MS,
    text: start > end - WEEK_MS ? "since you bought" : "in a week",
  }
}

// The portfolio's value since it was bought, or over the last week, against the S&P 500, each starting from what was put in
export function valueOverWeek(portfolio: Portfolio, now: string): ValuePoint[] {
  const { series, benchmarkSeries = series, holdings, cash, weekChange = 0 } = portfolio
  const invested = holdings.reduce((sum, { cost }) => sum + cost, cash)
  const value = portfolioValue(portfolio) ?? invested
  const own = between(series, invested, value)
  const market = between(benchmarkSeries, invested, invested * (1 + weekChange / 2))
  const { start, end } = holdPeriod(portfolio, now)

  return own.map((point, i) => {
    const at = new Date(start + (i / Math.max(own.length - 1, 1)) * (end - start)).toISOString()
    return { label: `${formatDay(at)}, ${formatTime(at)}`, value: point, benchmark: market[i] ?? point }
  })
}

// How much the portfolio is worth against what went into it
export function profit(portfolio: Portfolio) {
  const invested = portfolio.holdings.reduce((sum, { cost }) => sum + cost, portfolio.cash)
  return (portfolioValue(portfolio) ?? invested) - invested
}
