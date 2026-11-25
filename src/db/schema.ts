import { sql } from "drizzle-orm"
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { ActivityKind } from "@/constants/activity"
import type { DraftStage, PortfolioStatus } from "@/constants/portfolio"
import type { RuleSpec } from "@/lib/rules/spec"
import type { Order, Report } from "@/types/report"
import type { StrategyRow } from "@/types/rules"
import type { Strategy } from "@/types/strategy"

// The database Sandworm Stocks keeps for itself. Accounts belong to the main Sandworm app: `profiles` holds only what is about Stocks,
// keyed by that account's id, and nothing here points into the main app's database. Money is `numeric`, never a float: USDC to six
// places, stock-token units to eighteen, prices to eight. Nothing here holds anyone's money or keys: only approvals they signed and
// receipts (transaction hashes) of what they did.
// The design and the reasons are in docs/design/database-schema.md.

const at = (name: string) => timestamp(name, { withTimezone: true })
const usdc = (name: string) => numeric(name, { precision: 24, scale: 6, mode: "number" })

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  region: text("region"),
  interests: text("interests")
    .array()
    .notNull()
    .default(sql`'{}'`),
  onboardedAt: at("onboarded_at"),
  welcomeSeenAt: at("welcome_seen_at"),
  settings: jsonb("settings")
    .notNull()
    .default(sql`'{}'`),
  createdAt: at("created_at").notNull().defaultNow(),
})

// Wallets a person has used here. Only the address, never a key.
export const wallets = pgTable(
  "wallets",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    address: text("address").notNull(),
    chainId: integer("chain_id").notNull(),
    linkedAt: at("linked_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.chainId, table.address] }),
    check("wallets_address_lower", sql`${table.address} = lower(${table.address})`),
  ]
)

export const strategies = pgTable(
  "strategies",
  {
    id: text("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.userId),
    name: text("name").notNull(),
    brief: text("brief").notNull(),
    status: text("status").$type<PortfolioStatus>().notNull(),
    stage: text("stage").$type<DraftStage>(),
    mode: text("mode").$type<"paper" | "wallet">(),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: at("created_at").notNull().defaultNow(),
    updatedAt: at("updated_at").notNull().defaultNow(),
    startedAt: at("started_at"),
    closedAt: at("closed_at"),
  },
  (table) => [
    index("strategies_owner_idx").on(table.ownerId, table.createdAt.desc()),
    check("strategies_mode", sql`${table.mode} in ('paper', 'wallet')`),
  ]
)

export const strategyVersions = pgTable(
  "strategy_versions",
  {
    strategyId: text("strategy_id")
      .notNull()
      .references(() => strategies.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    rules: jsonb("rules").$type<RuleSpec[]>().notNull(),
    spec: jsonb("spec").$type<Strategy>().notNull(),
    summary: jsonb("summary").$type<StrategyRow[]>().notNull(),
    assumption: text("assumption").notNull().default(""),
    budget: usdc("budget").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.strategyId, table.version] })]
)

export const researchRuns = pgTable(
  "research_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: text("strategy_id").notNull(),
    version: integer("version").notNull(),
    source: text("source").$type<"standin" | "sandworm">().notNull(),
    status: text("status").$type<"running" | "ready" | "failed">().notNull(),
    startedAt: at("started_at").notNull().defaultNow(),
    expectedAt: at("expected_at"),
    finishedAt: at("finished_at"),
    report: jsonb("report").$type<Report>(),
    orders: jsonb("orders").$type<Order[]>(),
  },
  (table) => [
    foreignKey({
      columns: [table.strategyId, table.version],
      foreignColumns: [strategyVersions.strategyId, strategyVersions.version],
    }).onDelete("cascade"),
    index("research_runs_strategy_idx").on(table.strategyId, table.startedAt.desc()),
  ]
)

export const tradeApprovals = pgTable(
  "trade_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: text("strategy_id")
      .notNull()
      .references(() => strategies.id, { onDelete: "cascade" }),
    wallet: text("wallet").notNull(),
    chainId: integer("chain_id").notNull(),
    maxAmount: usdc("max_amount").notNull(),
    message: text("message").notNull(),
    signature: text("signature").notNull(),
    balanceSeen: usdc("balance_seen").notNull(),
    expiresAt: at("expires_at").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("trade_approvals_strategy_unique").on(table.strategyId),
    check("trade_approvals_wallet_lower", sql`${table.wallet} = lower(${table.wallet})`),
  ]
)

export const ledger = pgTable(
  "ledger",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    strategyId: text("strategy_id")
      .notNull()
      .references(() => strategies.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"deposit" | "withdraw" | "buy" | "sell" | "fee">().notNull(),
    symbol: text("symbol"),
    units: numeric("units", { precision: 38, scale: 18, mode: "number" }),
    price: numeric("price", { precision: 24, scale: 8, mode: "number" }),
    usdc: usdc("usdc").notNull(),
    fee: usdc("fee").notNull().default(0),
    impact: numeric("impact", { precision: 12, scale: 8, mode: "number" }),
    txHash: text("tx_hash"),
    chainId: integer("chain_id"),
    at: at("at").notNull().defaultNow(),
  },
  (table) => [
    index("ledger_strategy_idx").on(table.strategyId, table.at),
    uniqueIndex("ledger_receipt_unique")
      .on(table.chainId, table.txHash, table.symbol)
      .where(sql`${table.txHash} is not null`),
    check("ledger_kind", sql`${table.kind} in ('deposit', 'withdraw', 'buy', 'sell', 'fee')`),
    check(
      "ledger_trade_has_stock",
      sql`(${table.kind} in ('buy', 'sell')) = (${table.symbol} is not null and ${table.units} is not null)`
    ),
  ]
)

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    strategyId: text("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
    kind: text("kind").$type<ActivityKind>().notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    data: jsonb("data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    ledgerId: bigint("ledger_id", { mode: "number" }).references(() => ledger.id),
    at: at("at").notNull().defaultNow(),
  },
  (table) => [
    index("activity_user_idx").on(table.userId, table.at.desc()),
    index("activity_strategy_idx").on(table.strategyId, table.at.desc()),
  ]
)

export const activityState = pgTable(
  "activity_state",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    readAt: at("read_at"),
    archivedAt: at("archived_at"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.activityId] })]
)

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    room: text("room").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    text: text("text").notNull(),
    at: at("at").notNull().defaultNow(),
  },
  (table) => [
    index("chat_messages_room_idx").on(table.room, table.at.desc()),
    check("chat_messages_room", sql`${table.room} ~ '^0x[0-9a-f]{40}$'`),
    check("chat_messages_length", sql`char_length(${table.text}) <= 280`),
  ]
)
