import type { DraftStage, PortfolioStatus } from "@/constants/portfolio"
import type { Holding } from "@/lib/portfolios/types"
import type { Order, Report } from "@/lib/report/types"
import type { RuleSpec } from "@/lib/rules/spec"
import type { StrategyRow } from "@/lib/rules/types"
import type { Strategy } from "@/lib/strategy/types"

// How a strategy was started. Paper trading moves nothing. With a wallet, the person approved it to trade up to `amount` USDC from their own
// wallet, `from`, on `chainId`: the money stays in that wallet, and is never sent to us.
export type Funding = { mode: "paper" | "live"; amount: number; chainId?: number; from?: string }

// A strategy a person made here, from the idea they typed to what they hold once it is trading. This is what is stored, and it is the
// only shape the rest of the app asks the store for, so the store behind it (a file, Postgres, or the main app's API) can change
// without anything else knowing.
export type StrategyRecord = {
  id: string
  // Who made it, by the id they signed in with. Everything that reads or changes a strategy checks this first.
  ownerId: string
  name: string
  // What they typed, in their words. The agent's chat opens with it.
  brief: string
  status: PortfolioStatus
  // For a draft: how far it has got
  stage: DraftStage
  rules: RuleSpec[]
  strategy: Strategy
  // The rows of "Your idea", and what was assumed in reading it
  summary: StrategyRow[]
  assumption: string
  // The most it may put in, from the rules
  budget: number
  // The latest research: its report, and the orders buying it would place
  report?: Report
  orders?: Order[]
  holdings: Holding[]
  cash: number
  funding?: Funding
  createdAt: string
  updatedAt: string
  startedAt?: string
}

export interface StrategyStore {
  // Everything one person has made, newest first
  list(ownerId: string): Promise<StrategyRecord[]>
  get(id: string): Promise<StrategyRecord | undefined>
  // Adds it, or replaces what is stored under its id
  save(record: StrategyRecord): Promise<void>
}
