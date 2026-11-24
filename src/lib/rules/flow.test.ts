import { describe, expect, it } from "vitest"

import type { Portfolio } from "@/lib/portfolios/types"

import type { Condition } from "@/lib/strategy/types"
import { toChecks, toExits, toOrders } from "./flow"

import { checkRules, describeRule, explainRule, type RuleSpec, rulesSchema, specOf } from "./spec"

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

describe("condition rules", () => {
  // NVDAc is climbing: its price is above its 3-day average
  const climbing = [{ symbol: "NVDAc", liquidity: 500_000, series: [1, 2, 3, 4, 5] }]
  const above: Condition = {
    left: { symbol: "NVDAc", indicator: { kind: "price" } },
    op: ">",
    right: { symbol: "NVDAc", indicator: { kind: "sma", days: 3 } },
  }

  it("is a top-level rule that is saved, read back and said in words", () => {
    const spec: RuleSpec = { type: "condition", mode: "never", condition: above }
    expect(rulesSchema.safeParse([spec]).success).toBe(true)
    expect(rulesSchema.safeParse([{ type: "condition", mode: "sometimes", condition: above }]).success).toBe(false)
    const [reading] = checkRules(portfolio, [spec], climbing)
    expect(reading && specOf(reading.rule)).toEqual(spec)
    expect(explainRule(spec)).toEqual({
      lead: "Never",
      text: "trade while NVDAc's price is above its own 3-day average price.",
    })
    expect(explainRule({ ...spec, mode: "only" }).lead).toBe("Only")
  })

  it("is broken by a never while the condition is true, and by an only while it is not", () => {
    const state = (mode: "never" | "only", series = climbing) =>
      checkRules(portfolio, [{ type: "condition", mode, condition: above }], series)[0]?.rule.state
    expect(state("never")).toBe("broken")
    expect(state("only")).toBe("holds")
    const falling = [{ symbol: "NVDAc", liquidity: 500_000, series: [5, 4, 3, 2, 1] }]
    expect(state("never", falling)).toBe("holds")
    expect(state("only", falling)).toBe("broken")
  })

  it("holds, and says so, when there are no prices to read", () => {
    const [reading] = checkRules(portfolio, [{ type: "condition", mode: "never", condition: above }], stocks)
    expect(reading?.rule.state).toBe("holds")
    expect(reading?.reading).toMatch(/no prices/)
  })

  it("holds the orders back in the diagram while it is broken", () => {
    const readings = checkRules(portfolio, [{ type: "condition", mode: "never", condition: above }], climbing)
    expect(toChecks(readings, "start", 0).nodes[1]?.data).toMatchObject({
      kind: "rule",
      lead: "Never",
      state: "broken",
    })
    expect(toOrders(readings, "start", 0).node.data.state).toBe("broken")
  })
})

describe("stop-loss and take-profit", () => {
  // NVDAc is up 11% on what was paid for it, TSLAc is down 26%
  const read = (spec: RuleSpec) => checkRules(portfolio, [spec], stocks)[0]

  it("is broken once a stock has fallen past the stop-loss, and holds before that", () => {
    expect(read({ type: "stop-loss", limit: 0.2 })?.rule.state).toBe("broken")
    const near = read({ type: "stop-loss", limit: 0.3 })
    expect(near?.rule.state).toBe("holds")
    expect(near?.closeness).toBeCloseTo(0.86, 1)
    expect(near?.reading).toMatch(/^Worst is TSLAc at -25\.9%$/)
  })

  it("is broken once a stock is up past the take-profit, and holds before that", () => {
    expect(read({ type: "take-profit", limit: 0.1 })?.rule.state).toBe("broken")
    const far = read({ type: "take-profit", limit: 0.5 })
    expect(far?.rule.state).toBe("holds")
    expect(far?.reading).toMatch(/^Best is NVDAc at \+11\.1%$/)
  })

  it("is saved, read back and said in words, and holds when nothing is held", () => {
    for (const spec of [
      { type: "stop-loss", limit: 0.15 },
      { type: "take-profit", limit: 0.4 },
    ] satisfies RuleSpec[]) {
      expect(rulesSchema.safeParse([spec]).success).toBe(true)
      const reading = read(spec)
      expect(reading && specOf(reading.rule)).toEqual(spec)
      expect(explainRule(spec).lead).toBe("Always")
    }
    expect(rulesSchema.safeParse([{ type: "stop-loss", limit: 0 }]).success).toBe(false)
    expect(explainRule({ type: "stop-loss", limit: 0.15 }).text).toBe(
      "sell a stock that falls 15% below what you paid for it."
    )
    const empty = checkRules({ ...portfolio, holdings: [] }, [{ type: "stop-loss", limit: 0.2 }], stocks)[0]
    expect(empty?.rule.state).toBe("holds")
  })
})

describe("toChecks", () => {
  it("hangs a head, each rule and the order under the block it is given", () => {
    const { nodes, edges } = toChecks(checkRules(portfolio, specs, stocks), "start", 100)
    expect(nodes.map(({ data }) => data.kind)).toEqual(["checks", "rule", "rule", "rule", "rule"])
    expect(nodes.map(({ data }) => data.lead)).toEqual([undefined, "Never", "Never", "Only", "Always"])
    expect(nodes[0]?.position.y).toBe(100)
    expect(edges[0]).toMatchObject({ source: "start", target: "checks" })
    expect(edges.slice(1).every(({ source }) => source === "checks")).toBe(true)
    expect(nodes.every(({ id }) => id.startsWith("checks"))).toBe(true)
  })

  it("draws nothing for no rules", () => {
    expect(toChecks([], "start", 80).nodes).toEqual([])
  })

  it("holds the orders back when a rule is broken", () => {
    const { node } = toOrders(checkRules(portfolio, [{ type: "budget", amount: 3000 }], stocks), "start", 0)
    expect(node.data).toMatchObject({ state: "broken", detail: "Held back until every rule holds" })
  })

  it("places the orders once you say OK when nothing is broken", () => {
    const { node, edge } = toOrders(checkRules(portfolio, specs, stocks), "start", 500)
    expect(node.data.detail).toBe("Placed once you say OK")
    expect(node.position.y).toBe(500)
    expect(edge).toMatchObject({ source: "start", target: "orders" })
  })

  it("marks a rule near its line as the one to watch", () => {
    const { nodes } = toChecks(checkRules(portfolio, [{ type: "budget", amount: 4000 }], stocks), "start", 0)
    expect(nodes[1]?.data.state).toBe("watch")
  })
})

describe("a portfolio stop", () => {
  const stop: RuleSpec = { type: "portfolio-stop", limit: 0.3, pause: 63 }
  // Up, then 20% off its high
  const falling: Portfolio = { ...portfolio, series: [100, 120, 110, 96] }

  it("is saved, read back and said in words", () => {
    expect(rulesSchema.safeParse([stop]).success).toBe(true)
    expect(rulesSchema.safeParse([{ type: "portfolio-stop", limit: 0.3 }]).success).toBe(true)
    expect(rulesSchema.safeParse([{ type: "portfolio-stop", limit: 0 }]).success).toBe(false)
    expect(specOf(checkRules(portfolio, [stop], stocks)[0]!.rule)).toEqual(stop)
    expect(describeRule(stop)).toBe("Portfolio stop 30%")
    expect(explainRule(stop).text).toBe(
      "sell everything if the strategy falls 30% from its high, then stay in cash for 3 months."
    )
  })

  it("reads how far the whole portfolio is below its high", () => {
    const [reading] = checkRules(falling, [stop], stocks)
    expect(reading?.reading).toBe("20% below its high")
    expect(reading?.closeness).toBeCloseTo(0.667, 2)
    expect(checkRules(portfolio, [stop], stocks)[0]?.reading).toMatch(/no history/)
  })

  it("is drawn apart from the rules every trade is checked against, and never holds an order back", () => {
    const past: Portfolio = { ...portfolio, series: [100, 200, 100] }
    const readings = checkRules(past, [{ type: "budget", amount: 6000 }, stop], stocks)
    expect(readings[1]?.rule.state).toBe("broken")

    const checks = toChecks(readings, "start", 0)
    expect(checks.nodes.map(({ data }) => data.kind)).toEqual(["checks", "rule"])
    expect(checks.nodes.every(({ id }) => id.startsWith("checks"))).toBe(true)

    const exits = toExits(readings, "start", 200)
    expect(exits.nodes.map(({ data }) => data.kind)).toEqual(["checks", "rule"])
    expect(exits.nodes[0]?.data).toMatchObject({ title: "Exits", tag: "Exits", noun: "exit" })
    expect(exits.nodes[1]?.data).toMatchObject({ word: "Sells", state: "watch" })
    expect(exits.nodes.every(({ id }) => id.startsWith("exits"))).toBe(true)
    expect(exits.nodes[0]?.position.y).toBe(200)

    expect(toOrders(readings, "start", 0).node.data.state).toBe("holds")
  })

  it("draws no exits block when there are no exits", () => {
    expect(toExits(checkRules(portfolio, specs, stocks), "start", 0).nodes).toEqual([])
  })
})
