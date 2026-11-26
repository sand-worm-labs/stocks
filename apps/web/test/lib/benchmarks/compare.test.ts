import { describe, expect, it } from "vitest"

import { benchmarkLines } from "@/lib/benchmarks/compare"
import type { ValuePoint } from "@/lib/portfolios/performance"


const points: ValuePoint[] = [100, 101, 99, 103, 105].map((value, i) => ({ label: `d${i}`, time: 1000 + i, value }))
const fund = {
  id: "SPY",
  name: "S&P 500",
  fund: "SPDR",
  group: "US stocks" as const,
  weekChange: 0.02,
  series: [10, 12, 11, 14],
}

describe("benchmarkLines", () => {
  it("starts where the portfolio started and ends on the benchmark's own change", () => {
    const [line] = benchmarkLines([fund], points)

    expect(line?.values).toHaveLength(points.length)
    expect(line?.values[0]).toBeCloseTo(100)
    expect(line?.values.at(-1)).toBeCloseTo(102)
    expect(line?.change).toBe(0.02)
  })

  it("is nothing to draw without points", () => {
    expect(benchmarkLines([fund], [])[0]?.values).toEqual([])
  })

  it("is drawn from the fund's real prices when they are given, held to where the portfolio started", () => {
    const prices = [100, 110, 120].map((price, i) => ({ time: 1000 + i * 2, price }))
    const [line] = benchmarkLines([fund], points, { SPY: prices })

    expect(line?.values[0]).toBeCloseTo(100)
    expect(line?.values.at(-1)).toBeCloseTo(120)
    expect(line?.change).toBeCloseTo(0.2)
  })

  it("leaves out a fund with no real prices rather than drawing a made-up one", () => {
    expect(benchmarkLines([fund], points, {})).toEqual([])
  })
})
