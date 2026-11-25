import { describe, expect, it } from "vitest"

import type { Condition, History, Node, Strategy } from "@/types/strategy"
import { backtest } from "./backtest"
import { describeCondition } from "./describe"
import { evaluate, symbolsOf } from "./evaluate"
import { averageReturn, cumulativeReturn, ema, maxDrawdown, priceDeviation, rsi, sma, volatility } from "./indicators"

const rising = (from: number, by: number, length: number) => Array.from({ length }, (_, i) => from + by * i)

describe("indicators", () => {
  it("averages the last days, counting today", () => {
    expect(sma([1, 2, 3, 4, 5], 4, 3)).toBe(4)
  })

  it("has no reading until there are enough days", () => {
    expect(sma([1, 2], 1, 5)).toBeUndefined()
    expect(cumulativeReturn([1, 2], 1, 5)).toBeUndefined()
    expect(rsi([1, 2], 1, 5)).toBeUndefined()
  })

  it("reads the return over a span", () => {
    expect(cumulativeReturn([100, 110, 121], 2, 2)).toBeCloseTo(0.21)
  })

  it("puts RSI at 100 when it only rises and 0 when it only falls", () => {
    expect(rsi(rising(10, 1, 20), 19, 14)).toBe(100)
    expect(rsi(rising(40, -1, 20), 19, 14)).toBe(0)
  })

  it("reads no swing from a straight line of equal moves in percent", () => {
    expect(volatility([100, 100, 100, 100], 3, 3)).toBe(0)
  })
})

const above = (symbol: string, value: number): Condition => ({
  left: { symbol, indicator: { kind: "price" } },
  op: ">",
  right: { value },
})

describe("more indicators", () => {
  it("leans an exponential average toward the latest days", () => {
    const series = [10, 10, 10, 10, 20]
    expect(ema(series, 4, 3)).toBeGreaterThan(sma(series, 4, 3) ?? 99)
    expect(ema(series, 1, 3)).toBeUndefined()
  })

  it("reads the worst fall from a high in the span", () => {
    expect(maxDrawdown([100, 200, 100, 150], 3, 3)).toBeCloseTo(-0.5)
    expect(maxDrawdown([100, 110, 120], 2, 2)).toBe(0)
  })

  it("averages the daily moves", () => {
    expect(averageReturn([100, 110, 121], 2, 2)).toBeCloseTo(0.1)
  })

  it("reads no deviation from a flat price", () => {
    expect(priceDeviation([5, 5, 5], 2, 3)).toBe(0)
    expect(priceDeviation([4, 6], 1, 2)).toBeCloseTo(1)
  })
})

describe("more blocks", () => {
  const history: History = { AAA: rising(100, 1, 30), BBB: rising(100, -1, 30) }
  const choose = (condition: Condition): Node => ({
    type: "if",
    condition,
    then: { type: "asset", symbol: "AAA" },
    else: { type: "cash" },
  })

  it("holds nothing in a cash block, and leaves its share as cash in a group", () => {
    expect(evaluate({ type: "cash" }, history, 5)).toEqual({})
    const group: Node = {
      type: "group",
      weighting: "equal",
      children: [{ node: { type: "asset", symbol: "AAA" } }, { node: { type: "cash" } }],
    }
    expect(evaluate(group, history, 5)).toEqual({ AAA: 0.5 })
  })

  it("needs every condition under all, and any one under any, nested as deep as needed", () => {
    expect(evaluate(choose({ all: [above("AAA", 50), above("BBB", 500)] }), history, 5)).toEqual({})
    expect(evaluate(choose({ any: [above("AAA", 50), above("BBB", 500)] }), history, 5)).toEqual({ AAA: 1 })
    const nested = { all: [above("AAA", 50), { any: [above("BBB", 500), above("BBB", 50)] }] }
    expect(evaluate(choose(nested), history, 5)).toEqual({ AAA: 1 })
  })

  it("lists the stocks every condition reads", () => {
    expect(symbolsOf(choose({ all: [above("AAA", 1), above("BBB", 1)] })).sort()).toEqual(["AAA", "BBB"])
  })

  it("weights a filter's picks by inverse volatility", () => {
    const wild = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 ? 8 : -8))
    const filter: Node = {
      type: "filter",
      pick: "top",
      count: 2,
      by: { kind: "price" },
      from: ["STEADY", "WILD"],
      weighting: "inverse-volatility",
    }
    const weights = evaluate(filter, { STEADY: rising(100, 0.1, 30), WILD: wild }, 25)
    expect(weights.STEADY).toBeGreaterThan(weights.WILD ?? 1)
  })

  it("says a condition in words", () => {
    expect(describeCondition({ all: [above("AAA", 50), above("BBB", 7)] })).toBe(
      "AAA price is above 50 and BBB price is above 7"
    )
  })
})

describe("evaluate", () => {
  const history: History = { AAA: rising(100, 1, 30), BBB: rising(100, -1, 30), CCC: rising(100, 2, 30) }
  const asset = (symbol: string): Node => ({ type: "asset", symbol })

  it("holds one stock fully", () => {
    expect(evaluate(asset("AAA"), history, 10)).toEqual({ AAA: 1 })
  })

  it("splits a group equally", () => {
    const group: Node = {
      type: "group",
      weighting: "equal",
      children: [{ node: asset("AAA") }, { node: asset("BBB") }],
    }
    expect(evaluate(group, history, 10)).toEqual({ AAA: 0.5, BBB: 0.5 })
  })

  it("splits a group by the weights it is given, scaled to one", () => {
    const group: Node = {
      type: "group",
      weighting: "specified",
      children: [
        { node: asset("AAA"), weight: 3 },
        { node: asset("BBB"), weight: 1 },
      ],
    }
    expect(evaluate(group, history, 10)).toEqual({ AAA: 0.75, BBB: 0.25 })
  })

  it("gives the steadier stock more when weighting by inverse volatility", () => {
    const steady = rising(100, 0.1, 30)
    const wild = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 ? 8 : -8))
    const group: Node = {
      type: "group",
      weighting: "inverse-volatility",
      children: [{ node: asset("STEADY") }, { node: asset("WILD") }],
    }
    const weights = evaluate(group, { STEADY: steady, WILD: wild }, 25)
    expect(weights.STEADY).toBeGreaterThan(weights.WILD ?? 1)
    expect((weights.STEADY ?? 0) + (weights.WILD ?? 0)).toBeCloseTo(1)
  })

  it("nests groups, adding up what lands on the same stock", () => {
    const inner: Node = {
      type: "group",
      weighting: "equal",
      children: [{ node: asset("AAA") }, { node: asset("BBB") }],
    }
    const outer: Node = { type: "group", weighting: "equal", children: [{ node: inner }, { node: asset("AAA") }] }
    expect(evaluate(outer, history, 10)).toEqual({ AAA: 0.75, BBB: 0.25 })
  })

  const gate = (op: ">" | "<"): Node => ({
    type: "if",
    condition: {
      left: { symbol: "AAA", indicator: { kind: "price" } },
      op,
      right: { symbol: "AAA", indicator: { kind: "sma", days: 5 } },
    },
    then: asset("CCC"),
    else: asset("BBB"),
  })

  it("takes the then-branch when the condition holds, and the else when it does not", () => {
    expect(evaluate(gate(">"), history, 20)).toEqual({ CCC: 1 })
    expect(evaluate(gate("<"), history, 20)).toEqual({ BBB: 1 })
  })

  it("takes the else-branch while there is no reading yet", () => {
    expect(evaluate(gate(">"), history, 2)).toEqual({ BBB: 1 })
  })

  it("keeps the best few of a set, equally", () => {
    const top: Node = {
      type: "filter",
      pick: "top",
      count: 2,
      by: { kind: "return", days: 10 },
      from: ["AAA", "BBB", "CCC"],
    }
    expect(evaluate(top, history, 20)).toEqual({ CCC: 0.5, AAA: 0.5 })
    const bottom: Node = { ...top, pick: "bottom", count: 1 }
    expect(evaluate(bottom, history, 20)).toEqual({ BBB: 1 })
  })

  it("lists every stock a strategy can hold", () => {
    const tree: Node = {
      type: "if",
      condition: { left: { symbol: "SPY", indicator: { kind: "price" } }, op: ">", right: { value: 1 } },
      then: { type: "filter", pick: "top", count: 1, by: { kind: "price" }, from: ["AAA", "BBB"] },
      else: asset("CCC"),
    }
    expect(symbolsOf(tree).sort()).toEqual(["AAA", "BBB", "CCC", "SPY"])
  })
})

describe("backtest", () => {
  const hold = (symbol: string, schedule: Strategy["schedule"] = "monthly"): Strategy => ({
    name: "Hold",
    schedule,
    root: { type: "asset", symbol },
  })

  it("makes what the stock makes, less the fee on buying it", () => {
    const result = backtest(hold("AAA"), { AAA: [100, 100, 100, 200] }, { deposit: 1000, feeRate: 0.01 })
    expect(result.trades).toBe(1)
    expect(result.fees).toBeCloseTo(10)
    expect(result.totalReturn).toBeCloseTo(0.98, 1)
  })

  it("never acts on a price it could not have known", () => {
    const strategy: Strategy = {
      name: "Chase",
      schedule: "daily",
      root: {
        type: "if",
        condition: { left: { symbol: "AAA", indicator: { kind: "price" } }, op: ">", right: { value: 150 } },
        then: { type: "asset", symbol: "AAA" },
        else: { type: "asset", symbol: "BBB" },
      },
    }
    const result = backtest(strategy, { AAA: [100, 100, 200], BBB: [100, 100, 100] }, { deposit: 1000, feeRate: 0 })
    expect(result.totalReturn).toBeCloseTo(0)
  })

  it("measures the deepest fall from a high", () => {
    const result = backtest(hold("AAA", "daily"), { AAA: [100, 100, 200, 100, 150] }, { deposit: 1000, feeRate: 0 })
    expect(result.maxDrawdown).toBeCloseTo(-0.5)
  })

  it("rebalances as the prices move, and counts each trade", () => {
    const strategy: Strategy = {
      name: "Half and half",
      schedule: "daily",
      root: {
        type: "group",
        weighting: "equal",
        children: [{ node: { type: "asset", symbol: "AAA" } }, { node: { type: "asset", symbol: "BBB" } }],
      },
    }
    const result = backtest(
      strategy,
      { AAA: rising(100, 10, 6), BBB: rising(100, 0, 6) },
      { deposit: 1000, feeRate: 0 }
    )
    expect(result.trades).toBeGreaterThan(2)
    expect(result.values.at(-1)).toBeGreaterThan(1000)
  })
})
