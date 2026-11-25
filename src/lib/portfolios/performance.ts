import { formatDay, formatTime } from "@/lib/dates"

import type { Portfolio } from "@/types/portfolios"
import { sumLines, type ValuePoint, withLiveEnd } from "./history"
import { isLive, portfolioValue } from "./portfolio"

export type { ValuePoint }

export const deposited = ({ holdings, cash }: Portfolio) => holdings.reduce((sum, { cost }) => sum + cost, cash)

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function stretch(series: number[], first: number, last: number) {
  const start = series[0] ?? 0
  const span = (series.at(-1) ?? start) - start || 1
  return series.map((value) => first + ((value - start) * (last - first)) / span)
}

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

export function returnOnDeposit(portfolio: Portfolio) {
  const put = deposited(portfolio)
  return put ? profit(portfolio) / put : 0
}

export function profit(portfolio: Portfolio) {
  const invested = deposited(portfolio)
  return (portfolioValue(portfolio) ?? invested) - invested
}

export function totalValueOverWeek(
  portfolios: Portfolio[],
  now: string,
  histories?: Record<string, ValuePoint[]>
): ValuePoint[] {
  const live = portfolios.filter(isLive)
  if (histories && live.some(({ id }) => histories[id])) {
    return sumLines(
      live.map((portfolio) => {
        const history = histories[portfolio.id]
        return history
          ? withLiveEnd(history, portfolioValue(portfolio) ?? 0, new Date(now).getTime())
          : valueOverWeek(portfolio, now)
      })
    )
  }

  const lines = live.map((portfolio) => valueOverWeek(portfolio, now))
  const first = lines[0]
  if (!first) return []
  const length = Math.min(...lines.map(({ length }) => length))

  return first.slice(0, length).map(({ label, time }, i) => ({
    label,
    time,
    value: lines.reduce((sum, points) => sum + (points[i]?.value ?? 0), 0),
  }))
}

export const changeOver = (points: ValuePoint[]) => {
  const first = points[0]?.value
  const last = points.at(-1)?.value
  return first && last !== undefined ? last / first - 1 : 0
}
