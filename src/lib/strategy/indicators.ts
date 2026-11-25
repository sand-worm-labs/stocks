import type { Indicator } from "@/types/strategy"

// Each reads the series as it stood on day `at`, using that day and the days before it and never the days after. With too
// few days behind it there is no reading yet, and that is `undefined`, not a guess.

const window = (series: number[], at: number, days: number) =>
  at >= days && days > 0 ? series.slice(at - days, at + 1) : undefined

export function sma(series: number[], at: number, days: number) {
  const slice = at >= days - 1 && days > 0 ? series.slice(at - days + 1, at + 1) : undefined
  return slice && slice.reduce((sum, value) => sum + value, 0) / slice.length
}

export function ema(series: number[], at: number, days: number) {
  if (days <= 0 || at < days - 1) return undefined
  const k = 2 / (days + 1)
  let value = series.slice(0, days).reduce((sum, price) => sum + price, 0) / days
  for (let i = days; i <= at; i++) value = (series[i] ?? value) * k + value * (1 - k)
  return value
}

export function averageReturn(series: number[], at: number, days: number) {
  const slice = window(series, at, days)
  if (!slice) return undefined
  const moves = slice.slice(1).map((value, i) => value / (slice[i] || 1) - 1)
  return moves.reduce((sum, move) => sum + move, 0) / moves.length
}

export function priceDeviation(series: number[], at: number, days: number) {
  const slice = at >= days - 1 && days > 0 ? series.slice(at - days + 1, at + 1) : undefined
  if (!slice) return undefined
  const mean = slice.reduce((sum, price) => sum + price, 0) / slice.length
  return Math.sqrt(slice.reduce((sum, price) => sum + (price - mean) ** 2, 0) / slice.length)
}

export function maxDrawdown(series: number[], at: number, days: number) {
  const slice = window(series, at, days)
  if (!slice) return undefined
  let peak = slice[0] ?? 0
  let worst = 0
  for (const price of slice) {
    peak = Math.max(peak, price)
    if (peak) worst = Math.min(worst, price / peak - 1)
  }
  return worst
}

export function cumulativeReturn(series: number[], at: number, days: number) {
  const then = series[at - days]
  const now = series[at]
  return at >= days && days > 0 && then && now !== undefined ? now / then - 1 : undefined
}

export function rsi(series: number[], at: number, days: number) {
  const slice = window(series, at, days)
  if (!slice) return undefined
  let gains = 0
  let losses = 0
  for (let i = 1; i < slice.length; i++) {
    const move = (slice[i] ?? 0) - (slice[i - 1] ?? 0)
    if (move > 0) gains += move
    else losses -= move
  }
  if (gains === 0 && losses === 0) return 50
  return losses === 0 ? 100 : 100 - 100 / (1 + gains / losses)
}

export function volatility(series: number[], at: number, days: number) {
  const slice = window(series, at, days)
  if (!slice) return undefined
  const moves = slice.slice(1).map((value, i) => value / (slice[i] || 1) - 1)
  const mean = moves.reduce((sum, move) => sum + move, 0) / moves.length
  return Math.sqrt(moves.reduce((sum, move) => sum + (move - mean) ** 2, 0) / moves.length)
}

export function read(series: number[] | undefined, at: number, indicator: Indicator) {
  if (!series) return undefined
  switch (indicator.kind) {
    case "price":
      return series[at]
    case "sma":
      return sma(series, at, indicator.days)
    case "ema":
      return ema(series, at, indicator.days)
    case "sma-return":
      return averageReturn(series, at, indicator.days)
    case "std-price":
      return priceDeviation(series, at, indicator.days)
    case "drawdown":
      return maxDrawdown(series, at, indicator.days)
    case "rsi":
      return rsi(series, at, indicator.days)
    case "return":
      return cumulativeReturn(series, at, indicator.days)
    case "volatility":
      return volatility(series, at, indicator.days)
  }
}
