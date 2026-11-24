import { describe, expect, it } from "vitest"

import { editorHeight, fromList, JOINER, newComparison, toList } from "./condition"
import { setCondition } from "./edit"
import { strategySchema } from "./schema"
import type { Condition, Strategy } from "./types"

const one = newComparison("AAA")
const two: Condition = { left: { symbol: "BBB", indicator: { kind: "rsi", days: 14 } }, op: "<", right: { value: 30 } }

describe("a condition as a list", () => {
  it("reads one comparison, an all and an any as rows", () => {
    expect(toList(one)).toEqual({ match: "all", rows: [one] })
    expect(toList({ all: [one, two] })).toEqual({ match: "all", rows: [one, two] })
    expect(toList({ any: [one, two] })).toEqual({ match: "any", rows: [one, two] })
  })

  it("leaves a group inside a group to the JSON", () => {
    expect(toList({ all: [one, { any: [one, two] }] })).toBeUndefined()
  })

  it("goes back from rows to a condition, a lone row being just itself", () => {
    expect(fromList({ match: "all", rows: [one] })).toEqual(one)
    expect(fromList({ match: "any", rows: [one, two] })).toEqual({ any: [one, two] })
    for (const condition of [one, { all: [one, two] }, { any: [two, one] }] satisfies Condition[]) {
      const list = toList(condition)
      expect(list && fromList(list)).toEqual(condition)
    }
  })

  it("makes room for a row of two lines when it reads against another stock", () => {
    expect(editorHeight({ all: [one, two] })).toBeGreaterThan(editorHeight({ all: [two, two] }))
    expect(editorHeight(one)).toBeGreaterThan(editorHeight(two))
  })

  it("makes room for the AND / OR divider between conditions", () => {
    // A second one-line row adds its line, the gap before it, the divider, and the gap after the divider
    expect(editorHeight({ all: [two, two] }) - editorHeight(two)).toBe(32 + 10 + JOINER + 10)
  })
})

describe("setting a condition", () => {
  const strategy: Strategy = {
    name: "T",
    schedule: "weekly",
    root: { type: "if", condition: one, then: { type: "asset", symbol: "AAA" }, else: { type: "cash" } },
  }

  it("replaces the condition of the if, leaves the old strategy as it was, and stays valid", () => {
    const next = setCondition(strategy, "root", { all: [one, two] })
    expect(next.root.type === "if" && next.root.condition).toEqual({ all: [one, two] })
    expect(strategy.root.type === "if" && strategy.root.condition).toEqual(one)
    expect(strategySchema.safeParse(next).success).toBe(true)
  })

  it("leaves a block that is not an if as it was", () => {
    const hold: Strategy = { ...strategy, root: { type: "cash" } }
    expect(setCondition(hold, "root", two)).toEqual(hold)
  })
})
