import { describe, expect, it } from "vitest"

import { POINTS_PER_YEAR, startingOn, yearRange } from "@/lib/report/what-if"

const points = (strategy: number[], bench: number[] = strategy) => strategy.map((value, i) => ({ label: `p${i}`, strategy: value, bench: bench[i] ?? value }))

describe("starting on a date with a sum of money", () => {
  it("scales the test's own line to the sum, from that date", () => {
    const result = startingOn(points([1, 1.2, 1.5, 1.8], [1, 1.1, 1.1, 1.2]), 500, 1)
    expect(result?.line.map(({ label }) => label)).toEqual(["p1", "p2", "p3"])
    expect(result?.line[0]?.strategy).toBeCloseTo(500)
    expect(result?.line[0]?.bench).toBeCloseTo(500)
    expect(result?.strategyNow).toBeCloseTo(750)
    expect(result?.benchNow).toBeCloseTo(500 * (1.2 / 1.1))
  })

  it("has nothing to show for no money or a start past the end", () => {
    expect(startingOn(points([1, 2]), 0, 0)).toBeUndefined()
    expect(startingOn(points([1, 2]), 100, 5)).toBeUndefined()
  })
})

describe("how a year went", () => {
  const grow = (years: number, rate: number) => points(Array.from({ length: POINTS_PER_YEAR * years + 1 }, (_, i) => (1 + rate) ** (i / POINTS_PER_YEAR)))

  it("is the same for every stretch when it grew steadily", () => {
    const range = yearRange(grow(3, 0.1))
    expect(range?.bad).toBeCloseTo(0.1)
    expect(range?.typical).toBeCloseTo(0.1)
    expect(range?.good).toBeCloseTo(0.1)
  })

  it("spreads from a bad year to a good one, in order", () => {
    const wobble = points(Array.from({ length: POINTS_PER_YEAR * 3 }, (_, i) => 1 + i / 100 + Math.sin(i / 4) * 0.3))
    const range = yearRange(wobble)!
    expect(range.bad).toBeLessThan(range.typical)
    expect(range.typical).toBeLessThan(range.good)
  })

  it("says nothing without a year of history", () => {
    expect(yearRange(grow(1, 0.1).slice(0, 40))).toBeUndefined()
  })
})
