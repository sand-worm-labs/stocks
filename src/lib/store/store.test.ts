// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { describe, expect, it, vi } from "vitest"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { FileStore } from "./file"
import { PostgresStore } from "./postgres"
import type { StrategyRecord, StrategyStore } from "./types"

const record = (id: string, ownerId = "u1", extra: Partial<StrategyRecord> = {}): StrategyRecord => ({
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
  createdAt: "2026-11-24T10:00:00.000Z",
  updatedAt: "2026-11-24T10:00:00.000Z",
  ...extra,
})

// Starting an in-memory Postgres is slow, so it is started once for the file and its table is dropped before each test
let database: Promise<PGlite> | undefined
const postgres = async () => {
  database ??= PGlite.create()
  const db = await database
  await db.query("drop table if exists strategies")
  return new PostgresStore(async (text, values) => (await db.query(text, values)).rows as Record<string, unknown>[])
}

const stores: [string, () => Promise<StrategyStore>][] = [
  ["file", async () => new FileStore(join(await mkdtemp(join(tmpdir(), "store-")), "strategies.json"))],
  ["postgres", postgres],
]

vi.setConfig({ testTimeout: 30_000 })

describe.each(stores)("the %s store", (_name, make) => {
  it("keeps what is saved, whole, and gives it back by id", async () => {
    const store = await make()
    const saved = record("a", "u1", { report: undefined, startedAt: "2026-11-24T11:00:00.000Z" })
    await store.save(saved)
    expect(await store.get("a")).toEqual(saved)
    expect(await store.get("missing")).toBeUndefined()
  })

  it("replaces a record saved again under its id", async () => {
    const store = await make()
    await store.save(record("a"))
    await store.save(
      record("a", "u1", { name: "Renamed", stage: "researching", updatedAt: "2026-11-24T12:00:00.000Z" })
    )
    expect(await store.get("a")).toMatchObject({
      name: "Renamed",
      stage: "researching",
      updatedAt: "2026-11-24T12:00:00.000Z",
    })
  })

  it("lists only one person's strategies, newest first", async () => {
    const store = await make()
    await store.save(record("old", "u1", { createdAt: "2026-11-01T10:00:00.000Z" }))
    await store.save(record("new", "u1", { createdAt: "2026-11-20T10:00:00.000Z" }))
    await store.save(record("theirs", "u2"))
    expect((await store.list("u1")).map(({ id }) => id)).toEqual(["new", "old"])
    expect(await store.list("nobody")).toEqual([])
  })
})

describe("reading what a driver hands back", () => {
  const stored = record("a", "u1", {
    stage: "ready",
    holdings: [{ symbol: "NVDAc", units: 1, entryPrice: 100, cost: 100, value: 100 }],
  })
  const { id, ownerId, name, brief, status, stage, createdAt, updatedAt, startedAt, ...document } = stored
  const row = (data: unknown) => ({
    id,
    owner_id: ownerId,
    name,
    brief,
    status,
    stage,
    created_at: createdAt,
    updated_at: updatedAt,
    started_at: startedAt ?? null,
    data,
  })

  it.each([
    ["an object", document],
    ["JSON text", JSON.stringify(document)],
    [
      "JSON text wrapped twice, as one driver stores a string it is told is JSON",
      JSON.stringify(JSON.stringify(document)),
    ],
  ])("gives the whole strategy back from %s", async (_how, data) => {
    const store = new PostgresStore(async (text) => (text.startsWith("select") ? [row(data)] : []))
    expect(await store.get("a")).toEqual(stored)
  })

  it("sends the document as text and has the server make it JSON, so it can't be wrapped twice", async () => {
    const sent: { text: string; values?: unknown[] }[] = []
    await new PostgresStore(async (text, values) => (sent.push({ text, values }), [])).save(stored)
    const insert = sent.find(({ text }) => text.includes("insert into strategies"))
    expect(insert?.text).toContain("$7::text::jsonb")
    expect(typeof insert?.values?.[6]).toBe("string")
  })
})
