import { describe, expect, it } from "vitest"

import { getPortfolio } from "@/lib/portfolios/source"

import type { History, Strategy } from "@/types/strategy"
import { backtest } from "./backtest"
import { evaluate, symbolsOf } from "./evaluate"
import { parseStrategy } from "./schema"
import { getStrategy } from "./source"

const hold: Strategy = { name: "Hold", schedule: "daily", root: { type: "asset", symbol: "AAA" } }
const fall = [...Array(5).fill(100), 90, 80, 70, 80, 90, 100, 100, 100]

describe("exits in a backtest", () => {
  const history: History = { AAA: fall }

  it("sells a stock that has fallen past the stop-loss, and does not buy it straight back", () => {
    const stopped = backtest(hold, history, { feeRate: 0, stopLoss: 0.25, cooldown: 3 })
    const plain = backtest(hold, history, { feeRate: 0 })
    expect(stopped.exits).toBe(1)
    expect(stopped.values.at(-1)).toBeLessThan(plain.values.at(-1) ?? 0)
    expect(plain.exits).toBe(0)
  })

  it("buys again once the cooldown is over", () => {
    const stopped = backtest(hold, history, { feeRate: 0, stopLoss: 0.25, cooldown: 1 })
    expect(stopped.trades).toBeGreaterThan(2)
  })

  it("sells a stock that has risen past the take-profit", () => {
    const up: History = { AAA: [100, 100, 100, 120, 140, 160, 160] }
    expect(backtest(hold, up, { feeRate: 0, takeProfit: 0.3 }).exits).toBe(1)
  })

  it("changes nothing when no exit is given", () => {
    expect(backtest(hold, history).exits).toBe(0)
  })
})

describe("a stop on the whole portfolio", () => {
  const slide: History = { AAA: [100, 100, 100, 90, 80, 70, 60, 50, 50, 50, 50, 50] }

  it("sells everything once the portfolio is far enough below its high, and sits in cash for the pause", () => {
    const stopped = backtest(hold, slide, { feeRate: 0, portfolioStop: 0.2, pause: 4 })
    expect(stopped.exits).toBeGreaterThanOrEqual(1)
    expect(stopped.values[5]).toBeCloseTo(stopped.values[7] ?? 0)
    expect(stopped.values.at(-1)).toBeGreaterThan(backtest(hold, slide, { feeRate: 0 }).values.at(-1) ?? 0)
  })

  it("does nothing while the portfolio stays inside the limit", () => {
    expect(backtest(hold, slide, { feeRate: 0, portfolioStop: 0.6 }).exits).toBe(0)
  })
})

describe("Steady leaders", async () => {
  const portfolio = await getPortfolio("steady-leaders")
  if (!portfolio) throw new Error("Steady leaders is missing")
  const steadyLeadersStrategyMockData = await getStrategy(portfolio)
  const STEADY_UNIVERSE = symbolsOf(steadyLeadersStrategyMockData.root)

  const rising = (by: number) => Array.from({ length: 300 }, (_, i) => 100 * (1 + by) ** i)
  const history: History = Object.fromEntries(STEADY_UNIVERSE.map((s, i) => [s, rising(0.0005 + i * 0.0003)]))

  it("is a valid strategy over the nine stocks", () => {
    expect(parseStrategy(steadyLeadersStrategyMockData).ok).toBe(true)
    expect([...symbolsOf(steadyLeadersStrategyMockData.root)].sort()).toEqual([...STEADY_UNIVERSE].sort())
  })

  it("holds the 4 strongest of the nine, fully invested", () => {
    const weights = evaluate(steadyLeadersStrategyMockData.root, history, 299)
    expect(Object.keys(weights).sort()).toEqual(STEADY_UNIVERSE.slice(-4).sort())
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it("trades far less with its rebalance band than without", () => {
    const wobbly: History = Object.fromEntries(
      STEADY_UNIVERSE.map((s, i) => [s, rising(0.0004 + i * 0.0001).map((v, d) => v * (1 + 0.03 * Math.sin(d + i)))])
    )
    const withoutBand: Strategy = {
      ...steadyLeadersStrategyMockData,
      root:
        steadyLeadersStrategyMockData.root.type === "rebalance"
          ? steadyLeadersStrategyMockData.root.child
          : { type: "cash" },
    }
    expect(backtest(steadyLeadersStrategyMockData, wobbly).trades).toBeLessThan(backtest(withoutBand, wobbly).trades)
  })
})
