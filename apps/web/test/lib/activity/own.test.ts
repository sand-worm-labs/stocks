// @vitest-environment node
import { describe, expect, it } from "vitest"

import { tradeTotals } from "@/lib/activity/filter"
import { activityOf } from "@/lib/activity/own"
import { notificationsOf } from "@/lib/notifications/notifications"
import { openingLedger } from "@/lib/trade/ledger"
import type { StrategyRecord } from "@/types/store"


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

describe("activity from a strategy's money", () => {
  const AT = "2026-11-25T12:00:00.000Z"
  const live = {
    id: "s1",
    name: "S",
    brief: "b",
    status: "live",
    startedAt: AT,
    updatedAt: AT,
    funding: { mode: "paper", amount: 200.6 },
    holdings: [{ symbol: "NVDAc", units: 2, entryPrice: 100, cost: 200, value: 200 }],
    cash: 0,
    events: [{ kind: "live", at: AT }],
  } as unknown as StrategyRecord

  it("shows how it started, with its first buy as a trade", () => {
    const items = activityOf(live)
    expect(items.map(({ kind }) => kind)).toEqual(["started", "deposit", "bought"])
    expect(items.find(({ kind }) => kind === "bought")?.trade).toMatchObject({ symbol: "NVDAc", side: "buy", spend: 200, units: 2, tx: "" })
  })

  it("shows funds added, stocks sold and cash taken out, each with its receipt", () => {
    const record = {
      ...live,
      ledger: [
        ...openingLedger(live),
        { kind: "deposit", usdc: 50, at: "2026-11-25T13:00:00.000Z" },
        { kind: "sell", symbol: "NVDAc", units: -1, price: 120, usdc: 119.64, fee: 0.36, at: "2026-11-25T14:00:00.000Z" },
        { kind: "withdraw", usdc: -20, at: "2026-11-25T15:00:00.000Z" },
      ],
    } as StrategyRecord
    const items = activityOf(record)
    expect(items.map(({ kind }) => kind)).toEqual(["started", "deposit", "bought", "deposit", "sold", "withdrew"])
    expect(items.find(({ kind }) => kind === "sold")?.trade).toMatchObject({ side: "sell", spend: 120, units: 1, fee: 0.36 })
  })

  it("counts the trades, what was bought and the fees, so the totals aren't zero", () => {
    expect(tradeTotals(activityOf(live))).toMatchObject({ count: 1, spent: 200, fees: 0.6 })
  })

  it("has no money activity before it is trading", () => {
    expect(activityOf({ ...live, status: "draft" } as StrategyRecord).map(({ kind }) => kind)).toEqual(["started"])
  })
})
