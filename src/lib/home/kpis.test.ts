import { describe, expect, it } from "vitest"

import type { Portfolio } from "@/lib/portfolios/types"

import { buildKpis } from "./kpis"

const live: Portfolio = {
  id: "a",
  name: "Robotics",
  brief: "",
  status: "live",
  holdings: [{ symbol: "NVDAc", units: 1, value: 304.21, cost: 300 }],
  cash: 200,
  weekChange: 0.008,
  worstDip: -0.003,
  rules: { passing: 4, total: 4, checkedAt: "2026-11-20T09:00:00" },
  series: [],
}
const draft: Portfolio = { id: "b", name: "AI", brief: "", status: "draft", holdings: [], cash: 0, series: [] }

describe("buildKpis", () => {
  it("summarises the live portfolios and ignores drafts", () => {
    const [value, week, cash, rules] = buildKpis([live, draft])

    expect(value).toMatchObject({ value: "504.21", caption: "USDC across 1 live portfolio" })
    expect(week).toMatchObject({ value: "+0.8%", caption: "worst dip -0.3%", tone: "positive" })
    expect(cash).toMatchObject({ value: "200.00" })
    expect(rules).toMatchObject({ value: "4/4", caption: "holding, checked 09:00" })
  })

  it("has nothing to report with no live portfolio", () => {
    const [value, week, , rules] = buildKpis([draft])

    expect(value?.value).toBe("0.00")
    expect(week?.value).toBe("0%")
    expect(rules?.caption).toBe("nothing to check yet")
  })
})
