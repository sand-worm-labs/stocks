import { formatDay, formatTime } from "@/lib/dates"

import { isLive, portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

// `time` is in seconds, for a chart that draws on a clock
export type ValuePoint = { label: string; time: number; value: number }

// What has been put in: the cost of everything bought, and the cash waiting
export const deposited = ({ holdings, cash }: Portfolio) => holdings.reduce((sum, { cost }) => sum + cost, cash)

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// A series moved and stretched so it starts at one value and ends at another
export function stretch(series: number[], first: number, last: number) {
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
  const { series } = portfolio
  const invested = deposited(portfolio)
  const value = portfolioValue(portfolio) ?? invested
  const own = stretch(series, invested, value)
  const { start, end } = holdPeriod(portfolio, now)

  return own.map((point, i) => {
    const ms = start + (i / Math.max(own.length - 1, 1)) * (end - start)
    const at = new Date(ms).toISOString()
    return { label: `${formatDay(at)}, ${formatTime(at)}`, time: Math.floor(ms / 1000), value: point }
  })
}

// How much it has gained on what was put in, as a fraction: 0.02 is +2%
export function returnOnDeposit(portfolio: Portfolio) {
  const put = deposited(portfolio)
  return put ? profit(portfolio) / put : 0
}

// How much the portfolio is worth against what went into it
export function profit(portfolio: Portfolio) {
  const invested = deposited(portfolio)
  return (portfolioValue(portfolio) ?? invested) - invested
}

// Everything held in live portfolios added up over the same stretch
export function totalValueOverWeek(portfolios: Portfolio[], now: string): ValuePoint[] {
  const lines = portfolios.filter(isLive).map((portfolio) => valueOverWeek(portfolio, now))
  const first = lines[0]
  if (!first) return []
  const length = Math.min(...lines.map(({ length }) => length))

  return first.slice(0, length).map(({ label, time }, i) => ({
    label,
    time,
    value: lines.reduce((sum, points) => sum + (points[i]?.value ?? 0), 0),
  }))
}

// How far the value moved from its first point to its last, as a fraction
export const changeOver = (points: ValuePoint[]) => {
  const first = points[0]?.value
  const last = points.at(-1)?.value
  return first && last !== undefined ? last / first - 1 : 0
}
