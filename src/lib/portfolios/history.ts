import { formatDay, formatTime } from "@/lib/dates"
import type { PricePoint } from "@/lib/markets/history"

import type { Portfolio } from "./types"

// `time` is in seconds, for a chart that draws on a clock
export type ValuePoint = { label: string; time: number; value: number }

// What has been put in: the cost of everything bought, and the cash waiting
const deposited = ({ holdings, cash }: Portfolio) => holdings.reduce((sum, { cost }) => sum + cost, cash)

// The most points a chart is given, however much price history there is
const MOST_POINTS = 120

// What something cost at a moment: the last price at or before it. Before the first price there is, the first one.
export function priceAt(prices: PricePoint[], time: number) {
  let found = prices[0]
  for (const point of prices) {
    if (point.time > time) break
    found = point
  }
  return found?.price
}

const label = (seconds: number) => {
  const at = new Date(seconds * 1000).toISOString()
  return `${formatDay(at)}, ${formatTime(at)}`
}

// Evenly picked, always keeping the first and the last
function thin<T>(items: T[], most: number) {
  if (items.length <= most) return items
  return Array.from({ length: most }, (_, i) => items[Math.round((i / (most - 1)) * (items.length - 1))] as T)
}

// What a portfolio was worth over time, worked out and not recorded: once it is bought, what it holds does not change, so its value at
// any moment is its units times the price of each at that moment, plus its cash. That needs only the real prices since it was bought,
// and so it covers the time nobody was looking. It starts at what was put in, runs through every price the feed has, and ends now.
// Nothing comes back if there are no prices for what it holds, and the caller keeps its other way of drawing it.
export function valueHistory(
  portfolio: Portfolio,
  prices: Record<string, PricePoint[]>,
  nowMs: number,
  most = MOST_POINTS
): ValuePoint[] | undefined {
  if (!portfolio.startedAt) return undefined
  const start = Math.floor(new Date(portfolio.startedAt).getTime() / 1000)
  const now = Math.max(Math.floor(nowMs / 1000), start)
  const held = portfolio.holdings.filter(({ symbol }) => prices[symbol]?.length)
  if (!held.length) return undefined

  const times = [
    ...new Set([start, now, ...held.flatMap(({ symbol }) => (prices[symbol] ?? []).map(({ time }) => time))]),
  ]
    .filter((time) => time >= start && time <= now)
    .sort((a, b) => a - b)

  const worth = (time: number) =>
    portfolio.cash +
    portfolio.holdings.reduce(
      (sum, { symbol, units, entryPrice }) => sum + units * (priceAt(prices[symbol] ?? [], time) ?? entryPrice),
      0
    )

  return thin(times, most).map((time) => ({
    label: label(time),
    time,
    // The first point is what went in, whatever the market said that second
    value: time === start ? deposited(portfolio) : worth(time),
  }))
}

// A worked-out history brought up to the moment: its last point is the portfolio's value at the live prices, at `nowMs`, so the end of
// the line is where the totals say it is
export function withLiveEnd(history: ValuePoint[], liveValue: number, nowMs: number): ValuePoint[] {
  const last = history.at(-1)
  const time = Math.floor(nowMs / 1000)
  if (!last || last.time >= time) return [...history.slice(0, -1), ...(last ? [{ ...last, value: liveValue }] : [])]
  return [...history, { label: label(time), time, value: liveValue }]
}

// How a fund's price would have moved the same money: held to the portfolio's first value, and following the fund's own price at each
// of the portfolio's moments. Nothing if the fund has no prices.
export function fundValues(points: ValuePoint[], prices: PricePoint[]): number[] | undefined {
  const first = points[0]
  const base = first && priceAt(prices, first.time)
  if (!first || !base) return undefined
  return points.map(({ time }) => first.value * ((priceAt(prices, time) ?? base) / base))
}

// Lines drawn over different stretches, added into one: every moment any of them has, each held at its last value until its next
export function sumLines(lines: ValuePoint[][]): ValuePoint[] {
  const times = [...new Set(lines.flatMap((line) => line.map(({ time }) => time)))].sort((a, b) => a - b)
  const at = (line: ValuePoint[], time: number) => {
    let found = line[0]
    for (const point of line) {
      if (point.time > time) break
      found = point
    }
    return found?.value ?? 0
  }

  return thin(times, MOST_POINTS).map((time) => ({
    label: label(time),
    time,
    value: lines.reduce((sum, line) => sum + at(line, time), 0),
  }))
}
