import { describe, expect, it } from "vitest"

import { addChild, canRemove, newBlock, removeAt, setFilter, setShare, symbolsIn } from "./edit"
import { strategySchema } from "./schema"
import type { Strategy } from "./types"

const strategy: Strategy = {
  name: "Test",
  schedule: "weekly",
  root: {
    type: "group",
    weighting: "equal",
    children: [
      { node: { type: "asset", symbol: "AAPL" } },
      {
        node: {
          type: "if",
          condition: { left: { symbol: "SPY", indicator: { kind: "price" } }, op: ">", right: { value: 1 } },
          then: {
            type: "group",
            weighting: "specified",
            children: [{ node: { type: "asset", symbol: "MSFT" }, weight: 2 }],
          },
          else: { type: "cash" },
        },
      },
    ],
  },
}

describe("editing a strategy", () => {
  it("adds into the root group, last, and leaves the old strategy as it was", () => {
    const next = addChild(strategy, "root", { type: "cash" })
    expect(next.root.type === "group" && next.root.children).toHaveLength(3)
    expect(strategy.root.type === "group" && strategy.root.children).toHaveLength(2)
  })

  it("adds into a group inside an if, giving it the average share when the group splits by shares", () => {
    const next = addChild(strategy, "root.1.then", { type: "asset", symbol: "NVDA" })
    const inner = next.root.type === "group" && next.root.children[1]?.node
    const group = inner && inner.type === "if" ? inner.then : undefined
    expect(group?.type === "group" && group.children[1]).toEqual({ node: { type: "asset", symbol: "NVDA" }, weight: 2 })
  })

  it("does not add into something that is not a group", () => {
    expect(addChild(strategy, "root.0", { type: "cash" })).toEqual(strategy)
  })

  it("takes out one of several, and never the last in a group or what is not in a group", () => {
    expect(canRemove(strategy, "root.0")).toBe(true)
    expect(canRemove(strategy, "root.1.then.0")).toBe(false)
    expect(canRemove(strategy, "root")).toBe(false)
    expect(canRemove(strategy, "")).toBe(false)
    const next = removeAt(strategy, "root.0")
    expect(next.root.type === "group" && next.root.children).toHaveLength(1)
    expect(removeAt(strategy, "root.1.then.0")).toEqual(strategy)
  })

  it("finds every stock a strategy mentions", () => {
    expect(symbolsIn(strategy)).toEqual(["AAPL", "SPY", "MSFT"])
  })
})

describe("new blocks", () => {
  const symbols = ["AAPL", "MSFT", "NVDA"]

  it("makes only strategies the schema accepts, for every kind", () => {
    const blocks = [
      newBlock({ kind: "asset", symbol: "AAPL" }, symbols),
      newBlock({ kind: "cash" }, symbols),
      newBlock({ kind: "group" }, symbols),
      newBlock({ kind: "weight", weighting: "specified" }, symbols),
      newBlock({ kind: "weight", weighting: "inverse-volatility" }, symbols),
      newBlock({ kind: "if" }, symbols),
      newBlock({ kind: "any-all", match: "all" }, symbols),
      newBlock({ kind: "any-all", match: "any" }, symbols),
      newBlock({ kind: "filter" }, symbols),
    ]
    for (const root of blocks) {
      expect(root).toBeDefined()
      expect(strategySchema.safeParse({ name: "x", schedule: "daily", root }).success).toBe(true)
    }
  })

  it("makes a decision from the first stock, and cannot without one", () => {
    expect(newBlock({ kind: "filter" }, symbols)).toMatchObject({ from: symbols, count: 3 })
    expect(newBlock({ kind: "filter" }, ["AAPL"])).toMatchObject({ from: ["AAPL"], count: 1 })
    expect(newBlock({ kind: "if" }, [])).toBeUndefined()
    expect(newBlock({ kind: "cash" }, [])).toEqual({ type: "cash" })
  })
})

describe("setting a share", () => {
  const split = (weights: (number | undefined)[]): Strategy => ({
    name: "Split",
    schedule: "weekly",
    root: {
      type: "group",
      weighting: "specified",
      children: weights.map((weight, i) => ({ node: { type: "asset", symbol: `S${i}` }, weight })),
    },
  })
  const weightsOf = (next: Strategy) =>
    next.root.type === "group" ? next.root.children.map(({ weight }) => weight) : []

  it("gives the one changed its share and scales the others to fill what is left", () => {
    expect(weightsOf(setShare(split([70, 20, 10]), "root", 0, 50))).toEqual([50, 33.33, 16.67])
  })

  it("keeps every share as a percentage that adds up to a hundred", () => {
    const next = weightsOf(setShare(split([1, 1, 1]), "root", 1, 40))
    expect(next[1]).toBe(40)
    expect(next.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)).toBeCloseTo(100, 1)
  })

  it("splits what is left equally among others that had nothing", () => {
    expect(weightsOf(setShare(split([100, 0, 0]), "root", 0, 40))).toEqual([40, 30, 30])
  })

  it("keeps a share between nothing and everything, and a lone block at everything", () => {
    expect(weightsOf(setShare(split([50, 50]), "root", 0, 140))).toEqual([100, 0])
    expect(weightsOf(setShare(split([50, 50]), "root", 0, -5))).toEqual([0, 100])
    expect(weightsOf(setShare(split([3]), "root", 0, 20))).toEqual([100])
  })

  it("reaches a group inside an if, leaves the old strategy as it was, and ignores a group that is not set by shares", () => {
    const next = setShare(strategy, "root.1.then", 0, 30)
    const inner = next.root.type === "group" && next.root.children[1]?.node
    expect(inner && inner.type === "if" && inner.then.type === "group" && inner.then.children[0]?.weight).toBe(100)
    expect(setShare(strategy, "root", 0, 10)).toEqual(strategy)
    expect(strategySchema.safeParse(setShare(split([70, 30]), "root", 0, 55)).success).toBe(true)
  })
})

describe("changing a filter", () => {
  const picked: Strategy = {
    name: "Pick",
    schedule: "weekly",
    root: {
      type: "group",
      weighting: "equal",
      children: [
        {
          node: { type: "filter", pick: "top", count: 3, by: { kind: "return", days: 30 }, from: ["A", "B", "C", "D"] },
        },
      ],
    },
  }
  const filterAt = (next: Strategy) => {
    const child = next.root.type === "group" ? next.root.children[0]?.node : undefined
    if (child?.type !== "filter") throw new Error("not a filter")
    return child
  }

  it("changes what it picks, how many, by what, from which stocks and how they are weighted", () => {
    const next = setFilter(picked, "root.0", {
      pick: "bottom",
      count: 2,
      by: { kind: "rsi", days: 14 },
      from: ["A", "B"],
      weighting: "inverse-volatility",
    })
    expect(filterAt(next)).toEqual({
      type: "filter",
      pick: "bottom",
      count: 2,
      by: { kind: "rsi", days: 14 },
      from: ["A", "B"],
      weighting: "inverse-volatility",
    })
    expect(strategySchema.safeParse(next).success).toBe(true)
    expect(filterAt(picked).pick).toBe("top")
  })

  it("keeps how many a whole number from one up, and never leaves it with no stocks", () => {
    expect(filterAt(setFilter(picked, "root.0", { count: 0 })).count).toBe(1)
    expect(filterAt(setFilter(picked, "root.0", { count: 2.6 })).count).toBe(3)
    expect(filterAt(setFilter(picked, "root.0", { from: [] })).from).toEqual(["A", "B", "C", "D"])
  })

  it("leaves a block that is not a filter as it was", () => {
    expect(setFilter(picked, "root", { count: 5 })).toEqual(picked)
  })
})
