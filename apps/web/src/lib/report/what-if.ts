// What a backtest says about a sum of money, so a person can try their own. Everything here is the notebook's own line, scaled: nothing
// is predicted.
export type GrowthPoint = { label: string; strategy: number; bench: number }

// Weekly points: 252 trading days a year, one point every 5
export const POINTS_PER_YEAR = 50

export function startingOn(points: GrowthPoint[], amount: number, startAt: number) {
  const start = points[startAt]
  const end = points.at(-1)
  if (!start || !end || amount <= 0) return undefined

  const scaled = points.slice(startAt).map(({ label, strategy, bench }) => ({
    label,
    strategy: (amount * strategy) / start.strategy,
    bench: (amount * bench) / start.bench,
  }))
  const last = scaled.at(-1)!
  return { line: scaled, strategyNow: last.strategy, benchNow: last.bench }
}

const at = (sorted: number[], share: number) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0

// How a year went, looking at every stretch of a year in the test: the one that 1 in 20 fell short of, the middle one, and the one that
// 1 in 20 beat. Nothing without a year of history to look at.
export function yearRange(points: GrowthPoint[]) {
  const returns = points
    .slice(POINTS_PER_YEAR)
    .map(({ strategy }, i) => strategy / (points[i]?.strategy ?? 1) - 1)
    .toSorted((a, b) => a - b)
  if (returns.length < 8) return undefined
  return { bad: at(returns, 0.05), typical: at(returns, 0.5), good: at(returns, 0.95) }
}
