import { describe, expect, it } from "vitest"

import type { Portfolio } from "@/lib/portfolios/types"

import { buildAllocation } from "./allocation"

const base = { brief: "", holdings: [], cash: 0, series: [], createdAt: "2026-11-01T10:00:00" }
const draft: Portfolio = { ...base, id: "d", name: "Draft", status: "draft" }
const live = (id: string, held: number, cash = 0): Portfolio => ({
  ...base,
  id,
  name: id,
  status: "live",
  holdings: [{ symbol: "NVDAc", units: 1, entryPrice: held, value: held, cost: held }],
  cash,
})

describe("buildAllocation", () => {
  it("is each live model without its cash, biggest first, then the cash", () => {
    expect(buildAllocation([live("small", 100, 50), draft, live("big", 300, 150)])).toEqual([
      { id: "big", label: "big", value: 300, index: 0, change: 0 },
      { id: "small", label: "small", value: 100, index: 1, change: 0 },
      { id: "cash", label: "Cash (USDC)", value: 200 },
    ])
  })

  it("draws the five biggest and puts the rest together", () => {
    const many = Array.from({ length: 8 }, (_, i) => live(`m${i}`, 100 + i))
    const slices = buildAllocation(many)

    expect(slices.filter(({ index }) => index !== undefined)).toHaveLength(5)
    expect(slices.find(({ id }) => id === "other")).toMatchObject({ label: "3 other strategies", value: 100 + 101 + 102 })
  })

  it("says which way each is going, from what it has gained on what was put in", () => {
    const up: Portfolio = {
      ...live("up", 330),
      holdings: [{ symbol: "NVDAc", units: 1, entryPrice: 300, value: 330, cost: 300 }],
    }
    const down: Portfolio = {
      ...live("down", 270),
      holdings: [{ symbol: "NVDAc", units: 1, entryPrice: 300, value: 270, cost: 300 }],
    }
    const [first, second] = buildAllocation([up, down])

    expect(first?.change).toBeCloseTo(0.1)
    expect(second?.change).toBeCloseTo(-0.1)
  })

  it("is empty with nothing live", () => {
    expect(buildAllocation([draft])).toEqual([])
  })
})
