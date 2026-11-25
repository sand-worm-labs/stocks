import type { DraftStage, PortfolioStatus } from "@/constants/portfolio"
import type { RuleSpec } from "@/lib/rules/spec"
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

// The research on a strategy, which runs for a while on the agent's side. `readyAt` is when the stand-in agent will be done; Sandworm's
// will say when it is, and until it does there is none.
type ResearchRun = { startedAt: string; readyAt?: string }

export type StrategyRecord = {
  id: string
  // Who made it, by the id they signed in with. Everything that reads or changes a strategy checks this first.
  ownerId: string
  name: string
  brief: string
  status: PortfolioStatus
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
  save(record: StrategyRecord): Promise<void>
}
