import { describe, expect, it } from "vitest"

import { buildPortfoliosMockData } from "@/_mockdata/portfolios"

import { evaluate } from "@/lib/strategy/evaluate"
import { explainStrategy } from "@/lib/strategy/explain"
import { toGraph } from "@/lib/strategy/flow/graph"
import { parseStrategy } from "@/lib/strategy/schema"
import { getStrategy, isDesigned } from "@/lib/strategy/source"
import type { History } from "@/types/strategy"

const portfolios = buildPortfoliosMockData(40)

describe("getStrategy", () => {
  it("gives the sample when no strategy is named", async () => {
    expect((await getStrategy()).name).toBe("Trend and momentum")
  })

  it("builds a valid strategy for every portfolio, one that can be explained and drawn", async () => {
    for (const portfolio of portfolios) {
      const strategy = await getStrategy(portfolio)

      expect(parseStrategy(strategy).ok, portfolio.id).toBe(true)
      expect(explainStrategy(strategy).steps.length, portfolio.id).toBeGreaterThan(0)
      expect(toGraph(strategy).nodes.length, portfolio.id).toBeGreaterThan(0)
    }
  })

  it("runs in the engine, to weights that never add up to more than the whole", async () => {
    for (const portfolio of portfolios.filter(({ status }) => status === "live")) {
      const history: History = Object.fromEntries(
        portfolio.holdings.map(({ symbol }, n) => [
          symbol,
          Array.from({ length: 150 }, (_, day) => 100 + Math.sin(day / (6 + n)) * 8 + day * 0.1 * (n % 2 ? 1 : -1)),
        ])
      )
      const weights = Object.values(evaluate((await getStrategy(portfolio)).root, history, 149))

      expect(
        weights.reduce((sum, weight) => sum + weight, 0),
        portfolio.id
      ).toBeLessThanOrEqual(1.0001)
    }
  })

  it("trades only the stocks a live strategy holds", async () => {
    for (const portfolio of portfolios.filter(({ status, id }) => status === "live" && !isDesigned(id))) {
      const held = new Set(portfolio.holdings.map(({ symbol }) => symbol))
      const named = [...JSON.stringify(await getStrategy(portfolio)).matchAll(/"([A-Z]+c)"/g)].map(
        ([, symbol]) => symbol
      )

      expect(
        named.every((symbol) => held.has(symbol ?? "")),
        portfolio.id
      ).toBe(true)
    }
  })

  it("gives different logic to different strategies, and the same logic to the same one each time", async () => {
    const strategies = await Promise.all(portfolios.map((portfolio) => getStrategy(portfolio)))

    expect(new Set(strategies.map(({ name }) => name)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(strategies.map((strategy) => JSON.stringify(strategy))).size).toBeGreaterThan(30)
    expect(JSON.stringify(await getStrategy(portfolios[12]!))).toBe(JSON.stringify(strategies[12]))
  })

  it("fits the hand-made strategies to what they are for", async () => {
    const by = (id: string) => portfolios.find((portfolio) => portfolio.id === id)!

    expect((await getStrategy(by("robotics-20"))).name).toBe("Trend and momentum")
    expect((await getStrategy(by("big-tech-35"))).name).toBe("Step aside in a slump")
    expect((await getStrategy(by("memory-space"))).name).toBe("Rotate to the strongest")
    expect((await getStrategy(by("crypto-treasuries"))).name).toBe("Buy the dip")
  })
})
