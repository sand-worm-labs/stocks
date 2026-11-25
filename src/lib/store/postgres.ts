import { and, asc, desc, eq, inArray } from "drizzle-orm"

import type { Database } from "@/db/client"
import { activity, ledger, profiles, researchRuns, strategies, strategyVersions, tradeApprovals } from "@/db/schema"
import { activityOf } from "@/lib/activity/own"
import type { StrategyEvent, StrategyRecord, StrategyStore } from "@/types/store"

import { depositedIn, type LedgerLine, openingLines, positionsOf } from "./ledger"

type StrategyRow = typeof strategies.$inferSelect

// A strategy's events are kept as its activity: each is a kind of activity, and each happens once
const EVENT_OF_KIND = { drafted: "created", researching: "researching", ready: "ready", started: "live" } as const
type EventKind = keyof typeof EVENT_OF_KIND
const EVENT_KINDS = Object.keys(EVENT_OF_KIND) as EventKind[]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VERSION = 1

const iso = (date: Date) => date.toISOString()

function group<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>()
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item])
  return groups
}

export class PostgresStore implements StrategyStore {
  constructor(private readonly db: Database) {}

  async list(ownerId: string) {
    if (!UUID.test(ownerId)) return []
    const rows = await this.db
      .select()
      .from(strategies)
      .where(eq(strategies.ownerId, ownerId))
      .orderBy(desc(strategies.createdAt))
    return this.assemble(rows)
  }

  async get(id: string) {
    const rows = await this.db.select().from(strategies).where(eq(strategies.id, id))
    return (await this.assemble(rows))[0]
  }

  async save(record: StrategyRecord) {
    if (!UUID.test(record.ownerId))
      throw new Error("A strategy in the database belongs to an account, which has a uuid for an id")

    await this.db.transaction(async (tx) => {
      await tx.insert(profiles).values({ userId: record.ownerId }).onConflictDoNothing()
      await saveStrategy(tx, record)
      await saveResearch(tx, record)
      await openLedger(tx, record)
      await saveApproval(tx, record)
      await saveEvents(tx, record)
    })
  }

  // Strategies as records: everything that belongs to all of them is read at once, not strategy by strategy
  private async assemble(rows: StrategyRow[]): Promise<StrategyRecord[]> {
    if (rows.length === 0) return []
    const ids = rows.map(({ id }) => id)
    const [versions, runs, lines, approvals, events] = await Promise.all([
      this.db.select().from(strategyVersions).where(inArray(strategyVersions.strategyId, ids)),
      this.db
        .select()
        .from(researchRuns)
        .where(inArray(researchRuns.strategyId, ids))
        .orderBy(desc(researchRuns.startedAt)),
      this.db.select().from(ledger).where(inArray(ledger.strategyId, ids)).orderBy(asc(ledger.at), asc(ledger.id)),
      this.db.select().from(tradeApprovals).where(inArray(tradeApprovals.strategyId, ids)),
      this.db
        .select({ strategyId: activity.strategyId, kind: activity.kind, at: activity.at })
        .from(activity)
        .where(and(inArray(activity.strategyId, ids), inArray(activity.kind, EVENT_KINDS)))
        .orderBy(asc(activity.at)),
    ])
    const linesOf = group(lines, ({ strategyId }) => strategyId)
    const eventsOf = group(events, ({ strategyId }) => strategyId ?? "")
    const runsOf = group(runs, ({ strategyId }) => strategyId)

    return rows.map((row) => {
      const version = versions.find(
        ({ strategyId, version }) => strategyId === row.id && version === row.currentVersion
      )
      if (!version) throw new Error(`Strategy ${row.id} has no version ${row.currentVersion}`)
      const run = runsOf.get(row.id)?.find(({ version }) => version === row.currentVersion)
      const approval = approvals.find(({ strategyId }) => strategyId === row.id)
      const entries = (linesOf.get(row.id) ?? []).map(
        ({ kind, symbol, units, price, usdc, fee, at }): LedgerLine => ({
          kind,
          symbol: symbol ?? undefined,
          units: units ?? undefined,
          price: price ?? undefined,
          usdc,
          fee,
          at,
        })
      )
      const { holdings, cash } = positionsOf(entries)

      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        brief: row.brief,
        status: row.status,
        stage: row.stage ?? "ready",
        rules: version.rules,
        strategy: version.spec,
        summary: version.summary,
        assumption: version.assumption,
        budget: version.budget,
        report: run?.report ?? undefined,
        orders: run?.orders ?? undefined,
        holdings,
        cash,
        funding: row.mode
          ? {
              mode: row.mode === "wallet" ? "live" : "paper",
              amount: depositedIn(entries),
              ...(approval && {
                chainId: approval.chainId,
                from: approval.wallet,
                approval: {
                  message: approval.message,
                  signature: approval.signature,
                  balance: approval.balanceSeen,
                  expiresAt: iso(approval.expiresAt),
                },
              }),
            }
          : undefined,
        research: run && {
          startedAt: iso(run.startedAt),
          readyAt: run.expectedAt ? iso(run.expectedAt) : undefined,
        },
        events: (eventsOf.get(row.id) ?? []).map(
          ({ kind, at }): StrategyEvent => ({ kind: EVENT_OF_KIND[kind as EventKind], at: iso(at) })
        ),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        startedAt: row.startedAt ? iso(row.startedAt) : undefined,
      }
    })
  }
}

type Tx = Database

async function saveStrategy(tx: Tx, record: StrategyRecord) {
  const row = {
    name: record.name,
    brief: record.brief,
    status: record.status,
    stage: record.stage,
    mode: record.funding && (record.funding.mode === "live" ? ("wallet" as const) : ("paper" as const)),
    currentVersion: VERSION,
    updatedAt: new Date(record.updatedAt),
    startedAt: record.startedAt ? new Date(record.startedAt) : null,
  }
  await tx
    .insert(strategies)
    .values({ id: record.id, ownerId: record.ownerId, createdAt: new Date(record.createdAt), ...row })
    .onConflictDoUpdate({ target: strategies.id, set: row })

  const version = {
    rules: record.rules,
    spec: record.strategy,
    summary: record.summary,
    assumption: record.assumption,
    budget: record.budget,
  }
  await tx
    .insert(strategyVersions)
    .values({ strategyId: record.id, version: VERSION, ...version })
    .onConflictDoUpdate({ target: [strategyVersions.strategyId, strategyVersions.version], set: version })
}

async function saveResearch(tx: Tx, record: StrategyRecord) {
  if (!record.research && !record.report) return
  const ready = !(record.status === "draft" && record.stage === "researching")
  const finished = record.events.find(({ kind }) => kind === "ready")?.at ?? record.updatedAt
  const run = {
    source: "standin" as const,
    status: ready ? ("ready" as const) : ("running" as const),
    startedAt: new Date(record.research?.startedAt ?? record.createdAt),
    expectedAt: record.research?.readyAt ? new Date(record.research.readyAt) : null,
    finishedAt: ready ? new Date(finished) : null,
    report: record.report ?? null,
    orders: record.orders ?? null,
  }

  const [existing] = await tx
    .select({ id: researchRuns.id })
    .from(researchRuns)
    .where(and(eq(researchRuns.strategyId, record.id), eq(researchRuns.version, VERSION)))
    .orderBy(desc(researchRuns.startedAt))
    .limit(1)
  if (existing) await tx.update(researchRuns).set(run).where(eq(researchRuns.id, existing.id))
  else await tx.insert(researchRuns).values({ strategyId: record.id, version: VERSION, ...run })
}

async function openLedger(tx: Tx, record: StrategyRecord) {
  if (record.status !== "live" || !record.funding) return
  const [begun] = await tx.select({ id: ledger.id }).from(ledger).where(eq(ledger.strategyId, record.id)).limit(1)
  if (begun) return

  const at = new Date(record.startedAt ?? record.updatedAt)
  const lines = openingLines(record.holdings, record.funding.amount, at)
  await tx.insert(ledger).values(lines.map((line) => ({ ...line, strategyId: record.id })))
}

async function saveApproval(tx: Tx, record: StrategyRecord) {
  const { funding } = record
  if (!funding?.approval || !funding.from || funding.chainId === undefined) return
  const { message, signature, balance, expiresAt } = funding.approval
  await tx
    .insert(tradeApprovals)
    .values({
      strategyId: record.id,
      wallet: funding.from.toLowerCase(),
      chainId: funding.chainId,
      maxAmount: funding.amount,
      message,
      signature,
      balanceSeen: balance,
      expiresAt: new Date(expiresAt),
    })
    .onConflictDoNothing()
}

async function saveEvents(tx: Tx, record: StrategyRecord) {
  const done = await tx
    .select({ kind: activity.kind })
    .from(activity)
    .where(and(eq(activity.strategyId, record.id), inArray(activity.kind, EVENT_KINDS)))
  const known = new Set(done.map(({ kind }) => kind))

  const fresh = activityOf(record).filter(({ kind }) => !known.has(kind))
  if (fresh.length === 0) return
  await tx.insert(activity).values(
    fresh.map(({ kind, title, detail, at, action }) => ({
      userId: record.ownerId,
      strategyId: record.id,
      kind,
      title,
      detail,
      data: { action },
      at: new Date(at),
    }))
  )
}
