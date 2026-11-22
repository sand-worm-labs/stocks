// A repeatable wiggle around a drift, so every chart in the mock data looks the same on every load.
export function makeSeries(seed: number, drift: number, points = 14) {
  let state = seed
  let value = 100

  return Array.from({ length: points }, () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    value += drift + (state / 4_294_967_296 - 0.5) * 2
    return Number(value.toFixed(2))
  })
}

// The same shape moved so it ends on `last`
export const endAt = (series: number[], last: number) =>
  series.map((value) => Number(((value * last) / (series.at(-1) ?? 1)).toFixed(2)))
