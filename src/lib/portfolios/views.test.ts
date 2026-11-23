import { describe, expect, it } from "vitest"

import type { Portfolio } from "./types"
import { countsByView, inView, sortPortfolios } from "./views"

const base = { brief: "", series: [], createdAt: "2026-11-01T10:00:00" }
const held = (value: number, cost: number): Portfolio => ({
  ...base,
  id: `l${value}`,
  name: "L",
  status: "live",
  cash: 0,
  holdings: [{ symbol: "NVDAc", units: 1, entryPrice: cost, value, cost }],
})
const up = held(110, 100)
const down = held(90, 100)
const draft: Portfolio = { ...base, id: "d", name: "D", status: "draft", holdings: [], cash: 0 }

describe("inView", () => {
  it("narrows by status, and by whether a live portfolio is up or down", () => {
    expect(inView(up, "winning")).toBe(true)
    expect(inView(down, "winning")).toBe(false)
    expect(inView(down, "losing")).toBe(true)
    expect(inView(draft, "drafts")).toBe(true)
    expect(inView(draft, "live")).toBe(false)
    expect(inView(draft, "losing")).toBe(false)
  })

  it("counts what each view would show", () => {
    expect(countsByView([up, down, draft])).toEqual({ all: 3, live: 2, drafts: 1, winning: 1, losing: 1 })
  })
})

describe("sortPortfolios", () => {
  const small = held(105, 100)
  const old: Portfolio = { ...draft, id: "old", createdAt: "2026-10-01T10:00:00" }

  it("puts the most profitable first, and a draft after the live ones", () => {
    expect(sortPortfolios([draft, down, up, small], "profit").map(({ id }) => id)).toEqual([
      up.id,
      small.id,
      down.id,
      "d",
    ])
  })

  it("puts the biggest first, or the newest", () => {
    expect(sortPortfolios([small, up, down], "value").map(({ id }) => id)).toEqual([up.id, small.id, down.id])
    expect(sortPortfolios([old, draft], "newest").map(({ id }) => id)).toEqual(["d", "old"])
  })
})
