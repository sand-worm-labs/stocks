import { describe, expect, it } from "vitest"

import type { Portfolio } from "@/lib/portfolios/types"

import { aggregateStocks, groupHoldingsByModel, matchesSearch, summarizeHoldings } from "./groups"

const base = { brief: "", series: [], createdAt: "2026-11-01T10:00:00" }
const a: Portfolio = {
  ...base,
  id: "a",
  name: "A",
  status: "live",
  cash: 100,
  holdings: [
    { symbol: "AAPLc", units: 1, entryPrice: 90, value: 100, cost: 90 },
    { symbol: "NVDAc", units: 1, entryPrice: 330, value: 300, cost: 330 },
  ],
}
const b: Portfolio = {
  ...a,
  id: "b",
  name: "B",
  holdings: [{ symbol: "NVDAc", units: 1, entryPrice: 50, value: 50, cost: 50 }],
  cash: 50,
}
const draft: Portfolio = { ...base, id: "d", name: "D", status: "draft", holdings: [], cash: 0 }
const stocks = [{ symbol: "NVDAc", name: "NVIDIA" }]

describe("groupHoldingsByModel", () => {
  it("lists the stocks of each live model, biggest first, with their share and gain", () => {
    const [first] = groupHoldingsByModel([a, draft], stocks)

    expect(first?.value).toBe(500)
    expect(first?.rows.map(({ symbol }) => symbol)).toEqual(["NVDAc", "AAPLc"])
    expect(first?.rows[0]).toMatchObject({ name: "NVIDIA", weight: 0.6, gain: -30 })
    expect(first?.rows[1]).toMatchObject({ name: "AAPLc", gain: 10 })
  })

  it("shows a stock in every model that holds it, the biggest model first, and colours by that rank", () => {
    const groups = groupHoldingsByModel([draft, b, a], stocks)

    expect(groups.map(({ portfolio, index }) => [portfolio.id, index])).toEqual([
      ["a", 0],
      ["b", 1],
    ])
    expect(groups.flatMap(({ rows }) => rows).filter(({ symbol }) => symbol === "NVDAc")).toHaveLength(2)
  })
})

describe("aggregateStocks", () => {
  it("adds a stock up across the models that hold it", () => {
    const stocksHeld = aggregateStocks(groupHoldingsByModel([a, b], stocks))
    const nvda = stocksHeld.find(({ symbol }) => symbol === "NVDAc")

    expect(stocksHeld.map(({ symbol }) => symbol)).toEqual(["NVDAc", "AAPLc"])
    expect(nvda).toMatchObject({ value: 350, gain: -30 })
    expect(nvda?.models.map(({ id }) => id)).toEqual(["a", "b"])
    expect(nvda?.share).toBeCloseTo(350 / 450)
  })
})

describe("summarizeHoldings", () => {
  it("totals what is held, and names the best and worst stock", () => {
    const summary = summarizeHoldings(groupHoldingsByModel([a, b], stocks))

    expect(summary).toMatchObject({ value: 450, gain: -20, stocks: 2, models: 2 })
    expect(summary.best?.symbol).toBe("AAPLc")
    expect(summary.worst?.symbol).toBe("NVDAc")
  })
})

describe("matchesSearch", () => {
  it("matches a symbol or a name, ignoring case", () => {
    expect(matchesSearch({ symbol: "NVDAc", name: "NVIDIA" }, "nvid")).toBe(true)
    expect(matchesSearch({ symbol: "NVDAc", name: "NVIDIA" }, "aapl")).toBe(false)
    expect(matchesSearch({ symbol: "NVDAc", name: "NVIDIA" }, " ")).toBe(true)
  })
})
