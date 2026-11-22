import { describe, expect, it } from "vitest"

import { activityCounts, filterActivity, groupByDay, parseActivityFilter } from "./filter"
import type { Activity } from "./types"

const NOW = "2026-11-20T14:20:00"
const activity: Activity[] = [
  { id: "a", portfolioId: "p", kind: "checked", title: "Checked", detail: "", at: "2026-11-20T09:00:00" },
  { id: "b", portfolioId: "p", kind: "alert", title: "Alert", detail: "", at: "2026-11-20T08:12:00" },
  { id: "c", portfolioId: "p", kind: "refused", title: "Refused", detail: "", at: "2026-11-19T18:40:00" },
  { id: "d", portfolioId: "p", kind: "bought", title: "Bought", detail: "", at: "2026-11-18T15:31:00" },
]
const ids = (list: Activity[]) => list.map(({ id }) => id)

describe("activity", () => {
  it("keeps the events of a category, or all of them", () => {
    expect(ids(filterActivity(activity, "alerts"))).toEqual(["b"])
    expect(ids(filterActivity(activity, "refusals"))).toEqual(["c"])
    expect(filterActivity(activity, "all")).toHaveLength(4)
  })

  it("counts what each filter shows", () => {
    expect(activityCounts(activity)).toEqual({ all: 4, trades: 1, agent: 1, alerts: 1, refusals: 1 })
  })

  it("groups events by day, in order", () => {
    const groups = groupByDay(activity, NOW)

    expect(groups.map(({ label }) => label)).toEqual(["Today", "Yesterday", "18 Nov"])
    expect(ids(groups[0]?.events ?? [])).toEqual(["a", "b"])
  })

  it("shows everything for a filter it doesn't know", () => {
    expect(parseActivityFilter("trades")).toBe("trades")
    expect(parseActivityFilter("nonsense")).toBe("all")
  })
})
