// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { StrategyRecord, StrategyStore } from "@/types/store"

import { FileStore } from "./file"

const PAID = 200.6
const ME = "11111111-1111-4111-8111-111111111111"
const THEM = "22222222-2222-4222-8222-222222222222"

const record = (id: string, ownerId = ME, extra: Partial<StrategyRecord> = {}): StrategyRecord => ({
  id,
  ownerId,
  name: `Strategy ${id}`,
  brief: "Grow 500 USDC with robotics",
  status: "draft",
  stage: "rules",
  rules: [{ type: "budget", amount: 500 }],
  strategy: { name: "S", schedule: "monthly", root: { type: "cash" } },
  summary: [{ label: "Goal", value: "Growth" }],
  assumption: "",
  budget: 500,
  holdings: [],
  cash: 0,
  events: [{ kind: "created", at: "2026-11-24T10:00:00.000Z" }],
  createdAt: "2026-11-24T10:00:00.000Z",
  updatedAt: "2026-11-24T10:00:00.000Z",
  ...extra,
})

const live = (id: string, extra: Partial<StrategyRecord> = {}) =>
  record(id, ME, {
    status: "live",
    stage: "ready",
    holdings: [{ symbol: "NVDAc", units: 2, entryPrice: 100, cost: 200, value: 200 }],
    funding: { mode: "paper", amount: PAID },
    research: { startedAt: "2026-11-24T10:01:00.000Z", readyAt: "2026-11-24T10:01:45.000Z" },
    events: [
      { kind: "created", at: "2026-11-24T10:00:00.000Z" },
      { kind: "researching", at: "2026-11-24T10:01:00.000Z" },
      { kind: "ready", at: "2026-11-24T10:01:45.000Z" },
      { kind: "live", at: "2026-11-24T10:05:00.000Z" },
    ],
    startedAt: "2026-11-24T10:05:00.000Z",
    updatedAt: "2026-11-24T10:05:00.000Z",
    ...extra,
  })

const stores: [string, () => Promise<StrategyStore>][] = [
  ["file", async () => new FileStore(join(await mkdtemp(join(tmpdir(), "store-")), "strategies.json"))],
]

vi.setConfig({ testTimeout: 30_000 })

describe.each(stores)("the %s store", (_name, make) => {
  it("keeps what is saved, whole, and gives it back by id", async () => {
    const store = await make()
    const saved = record("a", ME, { startedAt: "2026-11-24T11:00:00.000Z" })
    await store.save(saved)
    expect(await store.get("a")).toEqual(saved)
    expect(await store.get("missing")).toBeUndefined()
  })

  it("replaces a record saved again under its id", async () => {
    const store = await make()
    await store.save(record("a"))
    await store.save(record("a", ME, { name: "Renamed", stage: "researching", updatedAt: "2026-11-24T12:00:00.000Z" }))
    expect(await store.get("a")).toMatchObject({
      name: "Renamed",
      stage: "researching",
      updatedAt: "2026-11-24T12:00:00.000Z",
    })
  })

  it("lists only one person's strategies, newest first", async () => {
    const store = await make()
    await store.save(record("old", ME, { createdAt: "2026-11-01T10:00:00.000Z" }))
    await store.save(record("new", ME, { createdAt: "2026-11-20T10:00:00.000Z" }))
    await store.save(record("theirs", THEM))
    expect((await store.list(ME)).map(({ id }) => id)).toEqual(["new", "old"])
    expect(await store.list("22222222-2222-4222-8222-999999999999")).toEqual([])
  })

  it("gives back a strategy that is trading: its stocks, what was paid in, and its research", async () => {
    const store = await make()
    const saved = live("a")
    await store.save(saved)
    expect(await store.get("a")).toEqual(saved)
  })
})
