import { describe, expect, it } from "vitest"

import type { PricePoint } from "@/lib/markets/history"

import { fundValues, priceAt, sumLines, valueHistory } from "@/lib/portfolios/history"
import type { Portfolio } from "@/types/portfolios"

const T0 = 1_700_000_000
const portfolio: Portfolio = {
  id: "p",
  name: "P",
  brief: "",
  status: "live",
  createdAt: "",
  startedAt: new Date(T0 * 1000).toISOString(),
  cash: 10,
  series: [],
  holdings: [
    { symbol: "AAA", units: 2, entryPrice: 100, cost: 200, value: 200 },
    { symbol: "BBB", units: 1, entryPrice: 50, cost: 50, value: 50 },
  ],
}
const prices: Record<string, PricePoint[]> = {
  AAA: [
    { time: T0 + 600, price: 100 },
    { time: T0 + 1200, price: 110 },
    { time: T0 + 1800, price: 90 },
  ],
  BBB: [{ time: T0 + 1200, price: 60 }],
}

describe("the price at a moment", () => {
  it("is the last one at or before it, and the first one before there was any", () => {
    expect(priceAt(prices.AAA!, T0 + 1000)).toBe(100)
    expect(priceAt(prices.AAA!, T0 + 1200)).toBe(110)
    expect(priceAt(prices.AAA!, T0)).toBe(100)
    expect(priceAt(prices.AAA!, T0 + 99_999)).toBe(90)
    expect(priceAt([], T0)).toBeUndefined()
  })
})

describe("what a portfolio was worth over time", () => {
  const points = valueHistory(portfolio, prices, (T0 + 2400) * 1000)!

  it("starts at what was put in, and ends now", () => {
    expect(points[0]).toMatchObject({ time: T0, value: 260 })
    expect(points.at(-1)).toMatchObject({ time: T0 + 2400 })
  })

  it("is its units times each price at each moment, plus its cash", () => {
    const at = (offset: number) => points.find(({ time }) => time === T0 + offset)?.value
    expect(at(1200)).toBe(2 * 110 + 1 * 60 + 10)
    expect(at(600)).toBe(2 * 100 + 1 * 60 + 10)
    expect(at(1800)).toBe(2 * 90 + 1 * 60 + 10)
    expect(points.at(-1)?.value).toBe(2 * 90 + 1 * 60 + 10)
  })

  it("never goes backwards in time, and has every price the feed had between", () => {
    const times = points.map(({ time }) => time)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(times).toEqual([T0, T0 + 600, T0 + 1200, T0 + 1800, T0 + 2400])
  })

  it("is thinned to the most a chart is given, keeping both ends", () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ time: T0 + 1 + i, price: 100 + (i % 7) }))
    const thin = valueHistory(portfolio, { AAA: many, BBB: many }, (T0 + 2000) * 1000, 50)!
    expect(thin).toHaveLength(50)
    expect(thin[0]?.time).toBe(T0)
    expect(thin.at(-1)?.time).toBe(T0 + 2000)
  })

  it("is nothing when there are no prices, or it was never started", () => {
    expect(valueHistory(portfolio, {}, (T0 + 100) * 1000)).toBeUndefined()
    expect(valueHistory({ ...portfolio, startedAt: undefined }, prices, T0 * 1000)).toBeUndefined()
  })

  it("holds a stock the feed has no prices for at what it cost", () => {
    const only = valueHistory(portfolio, { AAA: prices.AAA! }, (T0 + 1200) * 1000)!
    expect(only.at(-1)?.value).toBe(2 * 110 + 50 + 10)
  })
})

describe("a fund over the same moments", () => {
  const points = valueHistory(portfolio, prices, (T0 + 2400) * 1000)!
  const fund: PricePoint[] = [
    { time: T0 - 300, price: 400 },
    { time: T0 + 1200, price: 404 },
  ]

  it("moves the same money as the fund's price did, from the same start", () => {
    const values = fundValues(points, fund)!
    expect(values[0]).toBe(260)
    expect(values.at(-1)).toBeCloseTo(260 * 1.01)
    expect(values).toHaveLength(points.length)
  })

  it("is nothing when the fund has no prices", () => {
    expect(fundValues(points, [])).toBeUndefined()
  })
})

describe("lines over different stretches added together", () => {
  const line = (pairs: [number, number][]) => pairs.map(([time, value]) => ({ label: "", time, value }))

  it("adds each at every moment either has, holding each at its last value", () => {
    const total = sumLines([
      line([
        [0, 10],
        [10, 20],
      ]),
      line([
        [5, 100],
        [15, 200],
      ]),
    ])
    expect(total.map(({ time, value }) => [time, value])).toEqual([
      [0, 10 + 100],
      [5, 10 + 100],
      [10, 20 + 100],
      [15, 20 + 200],
    ])
  })
})
