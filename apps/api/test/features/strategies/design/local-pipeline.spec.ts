
import { reportMockData } from "@/_mockdata/reports"

import { BRIEF, market } from "../../../support/pipeline-fixtures"
import { createLocalPipeline, generatedName, pickStocks, shares } from "@/features/strategies/design/local-pipeline"

const pipeline = createLocalPipeline(reportMockData[1])

describe("picking stocks", () => {
  it("takes the stocks a theme names that can be bought, and no more than the cap needs", () => {
    const picked = pickStocks(["Robotics"], [], market, 0.2).map(({ symbol }) => symbol)
    expect(picked).toEqual(["NVDAc", "AMZNc", "GOOGLc", "TSLAc"])
  })

  it("takes a company named by its ticker or name, and leaves out what is to be avoided", () => {
    expect(pickStocks(["Tesla", "AAPL", "Meta"], ["meta"], market, 0.5).map(({ symbol }) => symbol)).toEqual([
      "TSLAc",
      "AAPLc",
    ])
  })

  it("takes the most liquid when nothing is named", () => {
    expect(pickStocks([], [], market, 0.35).map(({ symbol }) => symbol)).toEqual(["NVDAc", "AMZNc", "GOOGLc"])
  })

  it("holds equal shares, none past the cap, and leaves the rest as cash", () => {
    expect(shares(4, 0.2)).toEqual([0.2, 0.2, 0.2, 0.2])
    expect(shares(2, 0.2)).toEqual([0.2, 0.2])
    expect(shares(3, 0.5).every((share) => share === 1 / 3)).toBe(true)
  })
})

describe("designing from an idea", () => {
  it("turns what was said into rules, in the person's own numbers", async () => {
    const design = await pipeline.design(BRIEF, market)
    expect(design.budget).toBe(500)
    expect(design.rules).toEqual([
      { type: "budget", amount: 500 },
      { type: "max-weight", limit: 0.2 },
      { type: "min-liquidity", amount: 100_000 },
      { type: "approval" },
      { type: "portfolio-stop", limit: 0.2, pause: 63 },
    ])
    expect(design.name).toBe("Robotics, capped at 20%")
    expect(design.assumption).toMatch(/as written/)
    expect(design.strategy.root.type).toBe("rebalance")
  })

  it("names a strategy for what the idea is about, and says what of the idea it couldn't find", async () => {
    const design = await pipeline.design("Grow 1,000 USDC in stuff related to oil, ask before buying", market)
    expect(design.name).toBe("Oil stocks")
    expect(design.assumption).toMatch(/Nothing on Base matches oil\.$/)
    expect(design.summary.find(({ label }) => label === "Include")?.value).toMatch(/nothing on Base for oil/)
  })

  it("makes the name of a strategy from its idea alone, the same one the design is given, so a name the person chose can be told from it", async () => {
    const brief = "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock."
    expect(generatedName(brief)).toBe("Robotics, capped at 20%")
    expect((await pipeline.design(brief, market)).name).toBe(generatedName(brief))
  })

  it.each([
    ["Robotics stocks, max 20% in one stock", "Robotics, capped at 20%"],
    ["A return of at least 20% in a year, 3000 USDC: NVDA, TSLA, SNDK, AMZN, GOOGL. I don't mind the risk.", "NVDA, TSLA, SNDK and 2 more, aiming for 20% a year"],
    ["I'm new to investing. Grow my money steadily, max 20% in one stock", "Steady growth, capped at 20%"],
    ["Grow 1,000 USDC in oil stocks (Exxon, Chevron, Shell and similar). Ask before buying.", "Oil stocks"],
    ["Big tech and chips, try to beat the S&P 500", "Big tech and chips, to beat the S&P 500"],
    ["Robotics and AI stocks, max 20% in one stock", "Robotics and AI, capped at 20%"],
    ["Safe dividend income", "Steady income"],
    ["Healthcare and pharma companies that pay dividends. Safe income.", "Steady healthcare and pharma income"],
    ["Grow 1,000 USDC", "Growth with 1,000 USDC"],
    ["Buy NVDA", "NVDA"],
  ])("names %j as %j", (brief, name) => {
    expect(generatedName(brief)).toBe(name)
  })

  it("never makes a name longer than a title can hold", () => {
    const name = generatedName("Robotics, quantum, space, defense and big tech, aiming for 25% a year, capped at 10% a stock")
    expect(name.length).toBeLessThanOrEqual(60)
  })

  it("says what it assumed when the idea doesn't", async () => {
    const design = await pipeline.design("Put some money into Tesla", market)
    expect(design.budget).toBe(500)
    expect(design.assumption).toMatch(/budget of 500 USDC/)
    expect(design.assumption).toMatch(/−25%/)
    expect(design.rules).toContainEqual({ type: "portfolio-stop", limit: 0.25, pause: 63 })
    expect(design.rules).not.toContainEqual({ type: "approval" })
  })
})

describe("researching a design", () => {
  it("makes orders that fit the budget and the cap, and a report that says it is an example", async () => {
    const design = await pipeline.design(BRIEF, market)
    const { report, orders } = await pipeline.research({ ...design, brief: BRIEF }, market)

    expect(orders.map(({ symbol }) => symbol)).toEqual(["NVDAc", "AMZNc", "GOOGLc", "TSLAc"])
    expect(orders.every(({ spend }) => spend === 100)).toBe(true)
    expect(orders[0]?.receive).toBeCloseTo(100 / 125)
    expect(report.plan).toBe("Buy 4 stocks for 400 USDC · keep 100 USDC as cash")
    expect(report.allocation.at(-1)).toEqual({ symbol: "USDC", weight: 0.2 })
    expect(report.preview).toBe(true)
    expect(report.tolerance.panic).toBe(-0.2)
  })
})

describe("picking only stocks the strategy may trade", () => {
  it("leaves out a stock whose pool is thinner than the minimum liquidity rule", () => {
    const thin = [
      { symbol: "METAc", name: "Meta Platforms Inc.", liquidity: 700_000 },
      { symbol: "DJTc", name: "Trump Media & Technology Group Corp.", liquidity: 44 },
    ]
    const picked = pickStocks(["Meta", "Trump"], [], { stocks: thin, categories: [] }, 0.35, 100_000)
    expect(picked.map(({ symbol }) => symbol)).toEqual(["METAc"])
  })
})
