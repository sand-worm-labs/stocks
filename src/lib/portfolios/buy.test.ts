import { describe, expect, it } from "vitest"

import { buyRoom, quoteBuy } from "./buy"
import type { Portfolio } from "./types"

// 1,000 in all: 600 cash and 400 of one stock at 100 a unit
const portfolio: Portfolio = {
  id: "a",
  name: "A",
  brief: "",
  status: "live",
  createdAt: "2026-11-01T10:00:00",
  series: [],
  cash: 600,
  holdings: [{ symbol: "NVDAc", units: 4, entryPrice: 90, value: 400, cost: 360 }],
}

describe("buyRoom", () => {
  it("is what leaves the stock at its cap, when that is less than the cash", () => {
    expect(buyRoom(portfolio, "NVDAc", 0.5)).toBe(100)
  })

  it("is the cash, when the cap leaves more room than that", () => {
    expect(buyRoom(portfolio, "NVDAc", 1)).toBe(600)
  })

  it("is nothing for a stock already over its cap, or not held", () => {
    expect(buyRoom(portfolio, "NVDAc", 0.3)).toBe(0)
    expect(buyRoom(portfolio, "AAPLc", 0.5)).toBe(0)
  })
})

describe("quoteBuy", () => {
  it("takes the fee out, buys what is left at the price, and says how much of the portfolio it makes", () => {
    const quote = quoteBuy(portfolio, "NVDAc", 100)

    expect(quote?.fee).toBeCloseTo(0.3)
    expect(quote?.units).toBeCloseTo(0.997)
    expect(quote?.cashAfter).toBe(500)
    expect(quote?.weight).toBeGreaterThan(0.49)
  })
})
