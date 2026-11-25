import { describe, expect, it } from "vitest"

import { buildPortfoliosMockData } from "@/_mockdata/portfolios"

import { getRules } from "@/lib/rules/source"

describe("getRules", () => {
  it("gives the hand-made strategies the rules of their own briefs", async () => {
    const [robotics, bigTech, crypto] = await Promise.all(
      ["robotics-20", "big-tech-35", "crypto-treasuries"].map(async (id) => {
        const portfolio = buildPortfoliosMockData(6).find((one) => one.id === id)
        return (await getRules(portfolio!)).rules.map(({ label }) => label)
      })
    )

    expect(robotics).toEqual([
      "Budget 6,000 USDC",
      "Max 20% in any one stock",
      "Liquidity ≥ $100K on Base",
      "Ask before buying",
    ])
    expect(bigTech).toContain("Max 35% in any one stock")
    expect(crypto).toContain("Budget 2,800 USDC")
    expect(crypto).toContain("Stop-loss 25%")
  })

  it("varies the rules across a long list, and gives the same strategy the same rules each time", async () => {
    const portfolios = buildPortfoliosMockData(40)
    const sets = await Promise.all(
      portfolios.map(async (p) => (await getRules(p)).rules.map(({ label }) => label).join("|"))
    )
    const again = await getRules(portfolios[20]!)

    expect(new Set(sets).size).toBeGreaterThan(15)
    expect(again.rules.map(({ label }) => label).join("|")).toBe(sets[20])
  })

  it("keeps a budget that covers what a live strategy holds", async () => {
    for (const portfolio of buildPortfoliosMockData(40).filter(({ status }) => status === "live")) {
      const budget = (await getRules(portfolio)).rules.find(({ kind }) => kind === "budget")?.limit ?? 0
      const spent = portfolio.holdings.reduce((sum, { cost }) => sum + cost, 0)
      expect(budget).toBeGreaterThanOrEqual(spent)
    }
  })
})
