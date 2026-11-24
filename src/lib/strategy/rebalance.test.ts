import { describe, expect, it } from "vitest"

import { backtest } from "./backtest"
import { newBlock, setRebalance, symbolsIn } from "./edit"
import { evaluate, symbolsOf } from "./evaluate"
import { explainStrategy } from "./explain"
import { fromGraph } from "./flow/from-graph"
import { toGraph } from "./flow/graph"
import { parseStrategy } from "./schema"
import type { Node, Strategy } from "./types"

const half: Node = {
  type: "group",
  weighting: "equal",
  children: [{ node: { type: "asset", symbol: "AAA" } }, { node: { type: "asset", symbol: "BBB" } }],
}
const kept = (drift: number, every: "daily" | "weekly" | "monthly", schedule: Strategy["schedule"]): Strategy => ({
  name: "Kept",
  schedule,
  root: { type: "rebalance", drift, every, child: half },
})

describe("the rebalance block", () => {
  it("is read in, and refused when its drift is nothing or too much", () => {
    const strategy = kept(0.02, "monthly", "daily")
    expect(parseStrategy(JSON.stringify(strategy)).ok).toBe(true)
    expect(parseStrategy(JSON.stringify(kept(0, "monthly", "daily"))).ok).toBe(false)
    expect(parseStrategy(JSON.stringify(kept(0.9, "monthly", "daily"))).ok).toBe(false)
  })

  it("holds what is inside it and reads the stocks inside it", () => {
    const { root } = kept(0.02, "monthly", "daily")
    expect(evaluate(root, { AAA: [1, 1], BBB: [1, 1] }, 1)).toEqual({ AAA: 0.5, BBB: 0.5 })
    expect(symbolsOf(root)).toEqual(["AAA", "BBB"])
    expect(symbolsIn(kept(0.02, "monthly", "daily"))).toEqual(["AAA", "BBB"])
  })

  it("says what it does in words, with what is inside it set in under it", () => {
    const { steps } = explainStrategy(kept(0.02, "monthly", "daily"))
    expect(steps.map(({ depth, kind, text }) => `${depth} ${kind}: ${text}`)).toEqual([
      "0 keep: Back to target when any stock drifts more than 2 points from its share, checked every month:",
      "1 split: Split the money equally:",
      "2 do: Hold AAA.",
      "2 do: Hold BBB.",
    ])
  })

  it("draws as a block with what is inside it under it, and makes the same strategy again from the boxes", () => {
    const strategy = kept(0.02, "monthly", "daily")
    const { nodes, edges } = toGraph(strategy)
    expect(nodes.find(({ id }) => id === "root")?.data.block).toBe("rebalance")
    expect(edges.find(({ source }) => source === "root")?.target).toBe("root.child")
    expect(fromGraph(nodes, edges)).toEqual({ ok: true, strategy })
  })

  it("starts out as an equal group of the first stocks, and can have its drift and look changed", () => {
    const node = newBlock({ kind: "rebalance" }, ["AAA", "BBB", "CCC", "DDD"])
    expect(node).toMatchObject({ type: "rebalance", drift: 0.02, every: "monthly" })
    expect(symbolsOf(node as Node)).toEqual(["AAA", "BBB", "CCC"])

    const next = setRebalance(kept(0.02, "monthly", "daily"), "root", { drift: 0.05, every: "weekly" })
    expect(next.root).toMatchObject({ drift: 0.05, every: "weekly" })
    // Never nothing, and never more than half
    expect(setRebalance(next, "root", { drift: 0 }).root).toMatchObject({ drift: 0.01 })
    expect(setRebalance(next, "root", { drift: 3 }).root).toMatchObject({ drift: 0.5 })
  })

  it("trades back only once a stock has drifted past its band, and only on its own check days", () => {
    // AAA climbs 10% a day and BBB stays put, so an equal split drifts further every day
    const history = {
      AAA: Array.from({ length: 30 }, (_, i) => 100 * 1.1 ** i),
      BBB: Array.from({ length: 30 }, () => 100),
    }
    const options = { deposit: 1000, feeRate: 0 }
    // The strategy looks monthly, so without a rebalance it trades on day one and again on day 22: two stocks each time
    const plain = backtest({ ...kept(0.02, "daily", "monthly"), root: half }, history, options)
    expect(plain.trades).toBe(4)

    // Tight and checked daily: it trades back between the looks, whenever a stock is 2 points off
    expect(backtest(kept(0.02, "daily", "monthly"), history, options).trades).toBeGreaterThan(plain.trades)
    // Wide: AAA is only 38 points off its share by day 22, inside half, so nothing is traded back after buying in
    expect(backtest(kept(0.5, "daily", "monthly"), history, options).trades).toBe(2)
    // Tight but checked only monthly: it cannot trade more often than the monthly look does
    expect(backtest(kept(0.02, "monthly", "monthly"), history, options).trades).toBe(plain.trades)
  })
})
