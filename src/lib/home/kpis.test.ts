import { describe, expect, it } from "vitest"

import type { Portfolio } from "@/lib/portfolios/types"

import { markToMarket } from "@/lib/portfolios/valuation"

import { buildKpis } from "./kpis"

const live: Portfolio = {
  id: "a",
  name: "Robotics",
  brief: "",
  createdAt: "2026-11-01T10:00:00",
  status: "live",
  holdings: [{ symbol: "NVDAc", units: 1, entryPrice: 300, value: 304.21, cost: 300 }],
  cash: 200,
  weekChange: 0.008,
  worstDip: -0.003,
  rules: { passing: 4, total: 4, checkedAt: "2026-11-20T09:00:00" },
  series: [],
}
const draft: Portfolio = {
  id: "b",
  name: "AI",
  brief: "",
  createdAt: "2026-11-01T10:00:00",
  status: "draft",
  holdings: [],
  cash: 0,
  series: [],
}

describe("buildKpis", () => {
  it("summarises the live portfolios and ignores drafts", () => {
    const [value, deposited, profit, invested, cash] = buildKpis([live, draft])

    expect(value).toMatchObject({ value: "504.21", caption: "USDC across 1 live portfolio" })
    expect(value?.amount).toBeCloseTo(504.21)
    expect(deposited).toMatchObject({ value: "500.00", amount: 500 })
    expect(profit).toMatchObject({ value: "+4.21", tone: "positive" })
    expect(invested).toMatchObject({ value: "304.21" })
    expect(cash).toMatchObject({ value: "200.00" })
  })

  it("has nothing to report with no live portfolio", () => {
    const [value, deposited, profit] = buildKpis([draft])

    expect(value?.value).toBe("0.00")
    expect(deposited?.value).toBe("0.00")
    expect(profit?.caption).toBe("nothing put in yet")
  })

  it("moves with the price of what is held, while what was put in stays where it was", () => {
    const at = (price: number) => buildKpis([markToMarket(live, [{ symbol: "NVDAc", price }])])
    const [, putLow, , inStocksLow] = at(300)
    const [, putHigh, , inStocksHigh] = at(330)

    expect(inStocksLow?.amount).toBeCloseTo(300)
    expect(inStocksHigh?.amount).toBeCloseTo(330)
    expect(putHigh?.amount).toBe(putLow?.amount)
  })
})
