import { describe, expect, it } from "vitest"

import type { Portfolio } from "@/lib/portfolios/types"

import { toChecksGraph } from "./flow"
import { checkRules, describeRule, type RuleSpec, rulesSchema, specOf } from "./spec"

const portfolio: Portfolio = {
  id: "p",
  name: "P",
  brief: "",
  status: "live",
  createdAt: "2026-11-18T09:00:00Z",
  cash: 2400,
  series: [],
  holdings: [
    { symbol: "NVDAc", units: 10, entryPrice: 100, value: 1000, cost: 900 },
    { symbol: "TSLAc", units: 10, entryPrice: 100, value: 2000, cost: 2700 },
  ],
}
const stocks = [
  { symbol: "NVDAc", liquidity: 500_000 },
  { symbol: "TSLAc", liquidity: 198_530 },
]
const specs: RuleSpec[] = [
  { type: "budget", amount: 6000 },
  { type: "max-weight", limit: 0.5 },
  { type: "min-liquidity", amount: 100_000 },
  { type: "approval" },
]

describe("rules as data", () => {
  it("says each rule in words", () => {
    expect(specs.map(describeRule)).toEqual([
      "Budget 6,000 USDC",
      "Max 50% in any one stock",
      "Liquidity ≥ $100K on Base",
      "Ask before buying",
    ])
  })

  it("reads each rule against the portfolio", () => {
    const readings = checkRules(portfolio, specs, stocks)
    expect(readings.map(({ reading }) => reading)).toEqual([
      "3600 of 6000 USDC invested, 2400 in cash",
      "Biggest is TSLAc at 37% of 50%",
      "Thinnest is TSLAc at $198.53K",
      "Nothing is bought or sold without your OK",
    ])
    expect(readings.every(({ rule }) => rule.state === "holds")).toBe(true)
  })

  it("calls a rule broken once the portfolio is past its line", () => {
    const [budget] = checkRules(portfolio, [{ type: "budget", amount: 3000 }], stocks)
    expect(budget?.rule.state).toBe("broken")
  })

  it("goes from a rule to its data and back", () => {
    for (const spec of specs) {
      const [reading] = checkRules(portfolio, [spec], stocks)
      expect(reading && specOf(reading.rule)).toEqual(spec)
    }
  })

  it("refuses a rule that makes no sense", () => {
    expect(rulesSchema.safeParse([{ type: "max-weight", limit: 1.5 }]).success).toBe(false)
    expect(rulesSchema.safeParse([{ type: "budget", amount: -1 }]).success).toBe(false)
    expect(rulesSchema.safeParse([{ type: "vibes" }]).success).toBe(false)
  })
})

describe("toChecksGraph", () => {
  it("runs straight down: the strategy, each rule, your OK, then the orders", () => {
    const { nodes, edges } = toChecksGraph(checkRules(portfolio, specs, stocks), "Mine")
    expect(nodes.map(({ data }) => data.kind)).toEqual(["decide", "rule", "rule", "rule", "approval", "orders"])
    expect(nodes.every(({ position }) => position.x === 0)).toBe(true)
    expect(edges).toHaveLength(nodes.length - 1)
  })

  it("holds the orders back when a rule is broken", () => {
    const { nodes } = toChecksGraph(checkRules(portfolio, [{ type: "budget", amount: 3000 }], stocks), "Mine")
    expect(nodes.at(-1)?.data).toMatchObject({ state: "broken", detail: "Held back until every rule holds" })
  })

  it("marks a rule near its line as the one to watch", () => {
    const { nodes } = toChecksGraph(checkRules(portfolio, [{ type: "budget", amount: 4000 }], stocks), "Mine")
    expect(nodes[1]?.data.state).toBe("watch")
  })
})
