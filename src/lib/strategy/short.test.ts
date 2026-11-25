import { describe, expect, it } from "vitest"

import type { Node, Strategy } from "@/types/strategy"
import { backtest } from "./backtest"
import { setAsset } from "./edit"
import { evaluate } from "./evaluate"
import { explainStrategy } from "./explain"
import { strategySchema } from "./schema"

const strategyOf = (root: Node): Strategy => ({ name: "S", schedule: "daily", root })
const short: Node = { type: "asset", symbol: "AAA", side: "short", via: "perp" }

describe("shorting a stock", () => {
  it("holds a short as a weight below zero, and scales it inside a group", () => {
    expect(evaluate(short, {}, 0)).toEqual({ AAA: -1 })
    const pair: Node = {
      type: "group",
      weighting: "equal",
      children: [{ node: { type: "asset", symbol: "BBB" } }, { node: short }],
    }
    expect(evaluate(pair, {}, 0)).toEqual({ BBB: 0.5, AAA: -0.5 })
  })

  it("makes money in a backtest when the price falls, and loses it when the price rises", () => {
    const falling = { AAA: [100, 100, 90, 80, 70, 60] }
    const rising = { AAA: [100, 100, 110, 120, 130, 140] }
    expect(backtest(strategyOf(short), falling, { feeRate: 0 }).totalReturn).toBeGreaterThan(0)
    expect(backtest(strategyOf(short), rising, { feeRate: 0 }).totalReturn).toBeLessThan(0)
  })

  it("says it in words", () => {
    const words = (node: Node) => explainStrategy(strategyOf(node)).steps.map(({ text }) => text)
    expect(words(short)).toEqual(["Short AAA, through a perp."])
    expect(words({ type: "asset", symbol: "AAA", via: "perp" })).toEqual(["Hold AAA through a perp."])
    expect(words({ type: "asset", symbol: "AAA" })).toEqual(["Hold AAA."])
  })

  it("refuses a short that is not held through a perp", () => {
    expect(strategySchema.safeParse(strategyOf(short)).success).toBe(true)
    expect(strategySchema.safeParse(strategyOf({ type: "asset", symbol: "AAA", side: "short" })).success).toBe(false)
    expect(
      strategySchema.safeParse(strategyOf({ type: "asset", symbol: "AAA", side: "short", via: "spot" })).success
    ).toBe(false)
  })
})

describe("changing how a stock is held", () => {
  const long = strategyOf({ type: "asset", symbol: "AAA" })
  const rootOf = (strategy: Strategy) => strategy.root

  it("makes a short a perp, takes a long back to spot, and keeps only what is not the default", () => {
    const shorted = setAsset(long, "root", { side: "short" })
    expect(rootOf(shorted)).toEqual({ type: "asset", symbol: "AAA", side: "short", via: "perp" })
    expect(rootOf(setAsset(shorted, "root", { side: "long" }))).toEqual({ type: "asset", symbol: "AAA", via: "perp" })
    expect(rootOf(setAsset(shorted, "root", { side: "long", via: "spot" }))).toEqual({ type: "asset", symbol: "AAA" })
    expect(rootOf(setAsset(long, "root", { via: "perp" }))).toEqual({ type: "asset", symbol: "AAA", via: "perp" })
    expect(strategySchema.safeParse(shorted).success).toBe(true)
  })

  it("keeps a short on a perp even when asked for spot, and leaves what is not a stock alone", () => {
    const shorted = setAsset(long, "root", { side: "short" })
    expect(rootOf(setAsset(shorted, "root", { via: "spot" }))).toMatchObject({ side: "short", via: "perp" })
    const cash = strategyOf({ type: "cash" })
    expect(setAsset(cash, "root", { side: "short" })).toEqual(cash)
  })
})
