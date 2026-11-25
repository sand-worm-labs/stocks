// @vitest-environment node
import { describe, expect, it } from "vitest"

import { notificationsOf } from "@/lib/notifications/notifications"
import type { StrategyRecord } from "@/types/store"

import { activityOf } from "./own"

const record = {
  id: "robotics-1",
  name: "Robotics, capped at 20%",
  brief: "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock.",
  events: [
    { kind: "created", at: "2026-11-24T10:00:00.000Z" },
    { kind: "researching", at: "2026-11-24T10:01:00.000Z" },
    { kind: "ready", at: "2026-11-24T10:05:00.000Z" },
    { kind: "live", at: "2026-11-24T10:09:00.000Z" },
  ],
} as StrategyRecord

describe("a strategy's own activity", () => {
  const items = activityOf(record)

  it("tells each thing that happened, in order, for that strategy", () => {
    expect(items.map(({ kind }) => kind)).toEqual(["drafted", "researching", "ready", "started"])
    expect(items.every(({ portfolioId }) => portfolioId === "robotics-1")).toBe(true)
    expect(new Set(items.map(({ id }) => id)).size).toBe(4)
  })

  it("tells the person they needn't wait when research starts", () => {
    expect(items[1]?.detail).toMatch(/notified when the report is ready/)
  })

  it("makes a finished report a notification, with a way to read it", () => {
    const ready = notificationsOf(items)
    expect(ready.map(({ kind }) => kind)).toEqual(["ready"])
    expect(ready[0]?.title).toBe("Your report is ready")
    expect(ready[0]?.action).toEqual({ label: "View results", route: "portfolio", slug: "robotics-1" })
  })

  it("copes with a strategy saved before events were kept", () => {
    expect(activityOf({ ...record, events: undefined } as unknown as StrategyRecord)).toEqual([])
  })
})
