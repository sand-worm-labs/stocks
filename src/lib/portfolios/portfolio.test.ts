import { describe, expect, it } from "vitest"

import { exposureTo, heldSymbols, portfolioValue, rulesText, statusText } from "./portfolio"
import type { Portfolio } from "./types"

const live: Portfolio = {
  id: "a",
  name: "Robotics",
  brief: "",
  status: "live",
  holdings: [
    { symbol: "NVDAc", units: 1, value: 90, cost: 80 },
    { symbol: "TSLAc", units: 1, value: 60, cost: 70 },
  ],
  cash: 50,
  rules: { passing: 4, total: 4, checkedAt: "2026-11-20T09:00:00" },
  series: [],
}
const draft: Portfolio = { id: "b", name: "AI", brief: "", status: "draft", holdings: [], cash: 0, series: [] }
const unbuildable: Portfolio = {
  ...draft,
  id: "c",
  status: "unbuildable",
  rules: { passing: 3, total: 4, checkedAt: "2026-11-20T09:00:00" },
}

describe("portfolio", () => {
  it("values a live portfolio as its holdings plus cash, and a draft as nothing", () => {
    expect(portfolioValue(live)).toBe(200)
    expect(portfolioValue(draft)).toBeUndefined()
  })

  it("collects the stocks held in live portfolios only", () => {
    expect(Array.from(heldSymbols([live, draft]))).toEqual(["NVDAc", "TSLAc"])
  })

  it("says what each status is waiting on", () => {
    expect(statusText(live, "paper")).toBe("Live · paper")
    expect(statusText(draft, "paper")).toBe("Waiting for you to confirm rules")
    expect(statusText(unbuildable, "paper")).toBe("Can't be built")
  })

  it("reads the rules as passing, draft or failing", () => {
    expect(rulesText(live)).toBe("4/4")
    expect(rulesText(draft)).toBe("draft")
    expect(rulesText(unbuildable)).toBe("1 fails")
  })

  it("finds where a stock is held and how it has done", () => {
    const [exposure] = exposureTo([live, draft], "NVDAc")

    expect(exposure).toMatchObject({ value: 90, weight: 0.45, gain: 10 })
    expect(exposure?.gainRate).toBeCloseTo(0.125)
    expect(exposureTo([live, draft], "AAPLc")).toEqual([])
  })
})
