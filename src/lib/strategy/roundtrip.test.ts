import { describe, expect, it } from "vitest"

import type { Strategy } from "@/types/strategy"
import { fromGraph } from "./flow/from-graph"
import { toGraph } from "./flow/graph"
import { parseStrategy, serializeStrategy } from "./schema"
import { getStrategy } from "./source"

const everything: Strategy = {
  name: "Every block",
  schedule: "daily",
  root: {
    type: "if",
    condition: {
      all: [
        { left: { symbol: "AAA", indicator: { kind: "ema", days: 20 } }, op: ">", right: { value: 1 } },
        {
          any: [
            { left: { symbol: "BBB", indicator: { kind: "rsi", days: 14 } }, op: "<", right: { value: 30 } },
            {
              left: { symbol: "AAA", indicator: { kind: "price" } },
              op: ">",
              right: { symbol: "BBB", indicator: { kind: "sma", days: 50 } },
            },
          ],
        },
      ],
    },
    then: {
      type: "group",
      name: "Mixed",
      weighting: "specified",
      children: [
        {
          node: {
            type: "filter",
            pick: "bottom",
            count: 2,
            by: { kind: "drawdown", days: 60 },
            from: ["AAA", "BBB", "CCC"],
            weighting: "inverse-volatility",
            days: 30,
          },
          weight: 60,
        },
        { node: { type: "cash" }, weight: 40 },
      ],
    },
    else: {
      type: "group",
      weighting: "inverse-volatility",
      days: 20,
      children: [{ node: { type: "asset", symbol: "AAA" } }, { node: { type: "asset", symbol: "BBB" } }],
    },
  },
}

describe("strategy to blocks and back", () => {
  it("comes back exactly, for a strategy that uses every block", () => {
    const { nodes, edges } = toGraph(everything)
    const back = fromGraph(nodes, edges)
    expect(back).toEqual({ ok: true, strategy: everything })
    expect(back.ok && JSON.stringify(back.strategy)).toBe(JSON.stringify(everything))
  })

  it("comes back exactly, for the sample", async () => {
    const sample = await getStrategy()
    const { nodes, edges } = toGraph(sample)
    expect(fromGraph(nodes, edges)).toEqual({ ok: true, strategy: sample })
  })

  it("does not care what order the blocks and lines are listed in", () => {
    const { nodes, edges } = toGraph(everything)
    expect(fromGraph([...nodes].reverse(), [...edges].reverse())).toEqual({ ok: true, strategy: everything })
  })

  it("survives being saved as JSON and read back in the middle", () => {
    const { nodes, edges } = toGraph(everything)
    const saved = JSON.parse(JSON.stringify({ nodes, edges })) as ReturnType<typeof toGraph>
    expect(fromGraph(saved.nodes, saved.edges)).toEqual({ ok: true, strategy: everything })
  })

  it("says what is missing from a half-made graph", () => {
    const { nodes, edges } = toGraph(everything)
    const noNo = edges.filter(({ sourceHandle }) => sourceHandle !== "else")
    expect(fromGraph(nodes, noNo)).toEqual({ ok: false, error: "An if has no else path" })
    expect(fromGraph(nodes, [])).toEqual({ ok: false, error: "Nothing follows the start block" })
    expect(
      fromGraph(
        nodes.filter(({ id }) => id !== "start"),
        edges
      )
    ).toEqual({ ok: false, error: "There is no start block" })
  })
})

describe("JSON", () => {
  it("reads back what it wrote", () => {
    expect(parseStrategy(serializeStrategy(everything))).toEqual({ ok: true, strategy: everything })
  })

  it("goes all the way round: JSON, strategy, blocks, strategy, JSON", () => {
    const text = serializeStrategy(everything)
    const parsed = parseStrategy(text)
    if (!parsed.ok) throw new Error(parsed.error)
    const { nodes, edges } = toGraph(parsed.strategy)
    const back = fromGraph(nodes, edges)
    if (!back.ok) throw new Error(back.error)
    expect(JSON.parse(serializeStrategy(back.strategy))).toEqual(JSON.parse(text))
  })

  it("refuses what is not JSON", () => {
    expect(parseStrategy("{nope")).toEqual({ ok: false, error: "That is not valid JSON" })
  })

  it("says where a strategy is wrong", () => {
    const bad = { ...everything, schedule: "hourly" }
    const result = parseStrategy(bad)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain("schedule")
  })

  it("refuses an indicator that does not exist, or a span of no days", () => {
    const root = { type: "filter", pick: "top", count: 1, from: ["AAA"] }
    const make = (by: unknown) => parseStrategy({ name: "X", schedule: "daily", root: { ...root, by } })
    expect(make({ kind: "vibes", days: 3 }).ok).toBe(false)
    expect(make({ kind: "sma", days: 0 }).ok).toBe(false)
    expect(make({ kind: "sma", days: 5 }).ok).toBe(true)
  })

  it("refuses a group with nothing in it, and keys it does not know", () => {
    const group = { type: "group", weighting: "equal", children: [] }
    expect(parseStrategy({ name: "X", schedule: "daily", root: group }).ok).toBe(false)
    expect(parseStrategy({ name: "X", schedule: "daily", root: { type: "cash" }, extra: 1 }).ok).toBe(false)
  })
})
