export function makeSeries(seed: number, drift: number, points = 14) {
  let state = seed
  let value = 100

  return Array.from({ length: points }, () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    value += drift + (state / 4_294_967_296 - 0.5) * 2
    return Number(value.toFixed(2))
  })
}

export const endAt = (series: number[], last: number) =>
  series.map((value) => Number(((value * last) / (series.at(-1) ?? 1)).toFixed(2)))

export function makeGrowth(
  seed: number,
  volatility: number,
  builtTotal: number,
  heldTotal: number,
  built = 24,
  held = 12
) {
  let state = seed
  const next = () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
  const returns = (months: number, total: number) => {
    const steps = Array.from({ length: months }, () => (next() - 0.5) * 2 * volatility)
    const shift = (Math.log(total) - steps.reduce((sum, step) => sum + step, 0)) / months
    return steps.map((step) => step + shift)
  }

  return [...returns(built, builtTotal), ...returns(held, heldTotal)].reduce(
    (values, step) => [...values, Number(((values.at(-1) ?? 100) * Math.exp(step)).toFixed(2))],
    [100]
  )
}

export function makeFan(median: number, bad: number, good: number, months = 12) {
  const middle = Math.log(1 + median)
  const down = middle - Math.log(1 + bad)
  const up = Math.log(1 + good) - middle

  return Array.from({ length: months + 1 }, (_, month) => {
    const t = month / months
    const mid = middle * t
    return {
      month,
      low: Number((Math.exp(mid - down * Math.sqrt(t)) - 1).toFixed(4)),
      median: Number((Math.exp(mid) - 1).toFixed(4)),
      high: Number((Math.exp(mid + up * Math.sqrt(t)) - 1).toFixed(4)),
    }
  })
}
