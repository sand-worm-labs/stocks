import type { DraftStage, PortfolioStatus } from "@/constants/portfolio"
import type { ResearchResult } from "@/lib/research/result"
import type { RuleSpec } from "@/lib/rules/spec"
import type { AgentStep } from "@/types/agent"
import type { Holding } from "@/types/portfolios"
import type { Order, Report } from "@/types/report"
import type { StrategyRow } from "@/types/rules"
import type { Strategy } from "@/types/strategy"

// How a strategy was started. Paper trading moves nothing. With a wallet, the person approved it to trade up to `amount` USDC from their own
// wallet, `from`, on `chainId`: the money stays in that wallet, and is never sent to us.
export type Funding = {
  mode: "paper" | "live"
  amount: number
  chainId?: number
  from?: string
  // The signed approval a wallet start rests on, kept so it can be checked later
  approval?: Approval
}

type Approval = { message: string; signature: string; balance: number; expiresAt: string }

export type StrategyEvent = { kind: "created" | "researching" | "ready" | "live"; at: string }

// The research on a strategy, which runs for a while on the agent's side. A "timed" run is the stand-in's: it is done when `readyAt` comes. A
// "waiting" run is a real one (Sandworm's, or an agent driving it): it is done when it reports its `result`, or fails with an `error`.
export type ResearchRun = {
  startedAt: string
  readyAt?: string
  mode?: "timed" | "waiting"
  // Who does a waiting run: Sandworm's own agent (`sandworm`), or an agent from outside that hands the result back (`agent`)
  runner?: "sandworm" | "agent"
  result?: ResearchResult
  error?: string
  // Where a waiting run has got to, step by step, each with its notebook once there is one
  progress?: AgentStep[]
}

// One line of what happened to a strategy's cash and stocks. A buy or sell names the stock and the units (negative for a sale). `usdc` is the
// effect on the strategy's cash, fee included: what is spent is negative. The ledger is only ever added to; what is held, and the cash, are
// what it comes to.
export type LedgerLine = {
  kind: "deposit" | "withdraw" | "buy" | "sell" | "fee"
  symbol?: string
  units?: number
  price?: number
  usdc: number
  fee?: number
  at: string
}

export type StrategyRecord = {
  id: string
  // How many times it has been saved, set by the store. A strategy that is changed is saved with the revision it was read at.
  revision?: number
  // Who made it, by the id they signed in with. Everything that reads or changes a strategy checks this first.
  ownerId: string
  name: string
  brief: string
  status: PortfolioStatus
  closedAt?: string
  stage: DraftStage
  rules: RuleSpec[]
  strategy: Strategy
  summary: StrategyRow[]
  assumption: string
  budget: number
  report?: Report
  orders?: Order[]
  holdings: Holding[]
  cash: number
  ledger?: LedgerLine[]
  funding?: Funding
  research?: ResearchRun
  events: StrategyEvent[]
  createdAt: string
  updatedAt: string
  startedAt?: string
}

export interface StrategyStore {
  list(ownerId: string): Promise<StrategyRecord[]>
  get(id: string): Promise<StrategyRecord | undefined>
  // Keeps the record and says which revision it now is. Refused (a StoreConflict) when the strategy has been saved since the revision the record
  // carries, so a save made from an old read can't undo what came after it.
  save(record: StrategyRecord): Promise<number>
}
