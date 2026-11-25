// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { beforeAll, describe, expect, it } from "vitest"

import { activity, chatMessages, ledger, profiles, strategies, strategyVersions, tradeApprovals } from "./schema"

const USER = "11111111-1111-4111-8111-111111111111"
const ROOM = `0x${"a".repeat(40)}`

let db: ReturnType<typeof drizzle>

beforeAll(async () => {
  db = drizzle(await PGlite.create())
  await migrate(db, { migrationsFolder: "drizzle" })
  await db.insert(profiles).values({ userId: USER })
  await db
    .insert(strategies)
    .values({ id: "s1", ownerId: USER, name: "S", brief: "b", status: "draft", stage: "rules" })
})

describe("the schema, as its migrations make it", () => {
  it("keeps what a strategy is per version, and a person's profile with sensible defaults", async () => {
    await db.insert(strategyVersions).values({
      strategyId: "s1",
      version: 1,
      rules: [{ type: "budget", amount: 500 }],
      spec: { name: "S", schedule: "monthly", root: { type: "cash" } },
      summary: [],
      budget: 500,
    })
    const [profile] = await db.select().from(profiles)
    expect(profile).toMatchObject({ interests: [], settings: {}, onboardedAt: null })
    const [version] = await db.select().from(strategyVersions)
    expect(version?.budget).toBe(500)
  })

  it("only lets a strategy belong to a known person", async () => {
    await expect(
      db
        .insert(strategies)
        .values({ id: "s2", ownerId: "22222222-2222-4222-8222-222222222222", name: "S", brief: "b", status: "draft" })
    ).rejects.toThrow()
  })

  it("keeps exact amounts and holds a buy to a stock and units", async () => {
    await db.insert(ledger).values({ strategyId: "s1", kind: "deposit", usdc: 100.123456 })
    await db
      .insert(ledger)
      .values({ strategyId: "s1", kind: "buy", symbol: "NVDAx", units: 0.5, price: 120, usdc: -60, fee: 0.06 })
    const rows = await db.select().from(ledger)
    expect(rows.map((row) => row.usdc)).toEqual([100.123456, -60])
    await expect(db.insert(ledger).values({ strategyId: "s1", kind: "buy", usdc: -1 })).rejects.toThrow()
    await expect(db.insert(ledger).values({ strategyId: "s1", kind: "gift" as never, usdc: 1 })).rejects.toThrow()
  })

  it("counts a receipt once, but lets paper trades repeat", async () => {
    const receipt = {
      strategyId: "s1",
      kind: "sell" as const,
      symbol: "NVDAx",
      units: -0.1,
      usdc: 12,
      txHash: "0xabc",
      chainId: 84532,
    }
    await db.insert(ledger).values(receipt)
    await expect(db.insert(ledger).values(receipt)).rejects.toThrow()
    const paper = { strategyId: "s1", kind: "sell" as const, symbol: "NVDAx", units: -0.1, usdc: 12 }
    await db.insert(ledger).values([paper, paper])
  })

  it("approves a strategy to start only once, from a lower-case wallet", async () => {
    const approval = {
      strategyId: "s1",
      wallet: `0x${"b".repeat(40)}`,
      chainId: 84532,
      maxAmount: 500,
      message: "m",
      signature: "0xsig",
      balanceSeen: 900,
      expiresAt: new Date("2026-11-24T12:00:00.000Z"),
    }
    await db.insert(tradeApprovals).values(approval)
    await expect(db.insert(tradeApprovals).values(approval)).rejects.toThrow()
    await expect(db.insert(tradeApprovals).values({ ...approval, strategyId: "s1", wallet: "0xABC" })).rejects.toThrow()
  })

  it("keeps chat to a token's address and to 280 characters", async () => {
    await db.insert(chatMessages).values({ room: ROOM, userId: USER, name: "Trader", text: "gm" })
    await expect(db.insert(chatMessages).values({ room: "nvda", userId: USER, name: "T", text: "x" })).rejects.toThrow()
    await expect(
      db.insert(chatMessages).values({ room: ROOM, userId: USER, name: "T", text: "x".repeat(281) })
    ).rejects.toThrow()
  })

  it("keeps a person's activity when its strategy is deleted, and removes a strategy's ledger", async () => {
    await db.insert(activity).values({ userId: USER, strategyId: "s1", kind: "bought", title: "Bought" })
    await db.delete(strategies)
    const [row] = await db.select().from(activity)
    expect(row?.strategyId).toBeNull()
    expect(await db.select().from(ledger)).toEqual([])
  })
})
