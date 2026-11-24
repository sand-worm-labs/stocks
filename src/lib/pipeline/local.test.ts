import { describe, expect, it } from "vitest"

import { reportMockData } from "@/_mockdata/reports"

import { BRIEF, market } from "./fixtures"
import { createLocalPipeline, pickStocks, shares } from "./local"

const pipeline = createLocalPipeline(reportMockData[1])

describe("picking stocks", () => {
  it("takes the stocks a theme names that can be bought, and no more than the cap needs", () => {
    const picked = pickStocks(["Robotics"], [], market, 0.2).map(({ symbol }) => symbol)
    expect(picked).toEqual(["NVDAc", "AMZNc", "GOOGLc", "TSLAc"])
  })

  it("takes a company named by its ticker or name, and leaves out what is to be avoided", () => {
    expect(pickStocks(["Tesla", "AAPL", "Meta"], ["meta"], market, 0.5).map(({ symbol }) => symbol)).toEqual([
      "TSLAc",
      "AAPLc",
    ])
  })

  it("takes the most liquid when nothing is named", () => {
    expect(pickStocks([], [], market, 0.35).map(({ symbol }) => symbol)).toEqual(["NVDAc", "AMZNc", "GOOGLc"])
  })

  it("holds equal shares, none past the cap, and leaves the rest as cash", () => {
    expect(shares(4, 0.2)).toEqual([0.2, 0.2, 0.2, 0.2])
    expect(shares(2, 0.2)).toEqual([0.2, 0.2])
    expect(shares(3, 0.5).every((share) => share === 1 / 3)).toBe(true)
  })
})

describe("designing from an idea", () => {
  it("turns what was said into rules, in the person's own numbers", async () => {
    const design = await pipeline.design(BRIEF, market)
    expect(design.budget).toBe(500)
    expect(design.rules).toEqual([
      { type: "budget", amount: 500 },
      { type: "max-weight", limit: 0.2 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "approval" },
      { type: "portfolio-stop", limit: 0.2, pause: 63 },
    ])
    expect(design.name).toBe("Robotics, capped at 20%")
    expect(design.assumption).toMatch(/as written/)
    expect(design.strategy.root.type).toBe("rebalance")
  })

  it("says what it assumed when the idea doesn't", async () => {
    const design = await pipeline.design("Put some money into Tesla", market)
    expect(design.budget).toBe(500)
    expect(design.assumption).toMatch(/budget of 500 USDC/)
    expect(design.assumption).toMatch(/−25%/)
    expect(design.rules).toContainEqual({ type: "portfolio-stop", limit: 0.25, pause: 63 })
    expect(design.rules).not.toContainEqual({ type: "approval" })
  })
})

describe("researching a design", () => {
  it("makes orders that fit the budget and the cap, and a report that says it is an example", async () => {
    const design = await pipeline.design(BRIEF, market)
    const { report, orders } = await pipeline.research({ ...design, brief: BRIEF }, market)

    expect(orders.map(({ symbol }) => symbol)).toEqual(["NVDAc", "AMZNc", "GOOGLc", "TSLAc"])
    expect(orders.every(({ spend }) => spend === 100)).toBe(true)
    expect(orders[0]?.receive).toBeCloseTo(100 / 125)
    expect(report.plan).toBe("Buy 4 stocks for 400 USDC · keep 100 USDC as cash")
    expect(report.allocation.at(-1)).toEqual({ symbol: "USDC", weight: 0.2 })
    expect(report.preview).toBe(true)
    expect(report.tolerance.panic).toBe(-0.2)
  })
})
