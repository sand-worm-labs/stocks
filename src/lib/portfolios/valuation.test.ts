import { describe, expect, it } from "vitest"

import type { Portfolio } from "./types"
import { markToMarket } from "./valuation"

const base = { brief: "", series: [], cash: 100, createdAt: "2026-11-01T10:00:00" }
const live: Portfolio = {
  ...base,
  id: "a",
  name: "A",
  status: "live",
  holdings: [
    { symbol: "NVDAc", units: 2, entryPrice: 100, cost: 0, value: 0 },
    { symbol: "AAPLc", units: 1, entryPrice: 300, cost: 300, value: 310 },
  ],
}

describe("markToMarket", () => {
  it("values each stock at today's price and its cost at the price it was bought at", () => {
    const [nvda] = markToMarket(live, [{ symbol: "NVDAc", price: 125 }]).holdings

    expect(nvda).toMatchObject({ cost: 200, value: 250 })
  })

  it("keeps the value of a stock the market has no price for", () => {
    const [, aapl] = markToMarket(live, [{ symbol: "NVDAc", price: 125 }]).holdings

    expect(aapl).toMatchObject({ cost: 300, value: 310 })
  })

  it("leaves a portfolio that holds nothing as it is", () => {
    const draft: Portfolio = { ...base, id: "d", name: "D", status: "draft", holdings: [], cash: 0 }

    expect(markToMarket(draft, [{ symbol: "NVDAc", price: 125 }])).toBe(draft)
  })
})
