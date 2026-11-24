import type { Stock, StockCategory } from "@/lib/markets/types"
import type { Order, Report } from "@/lib/report/types"
import type { RuleSpec } from "@/lib/rules/spec"
import type { StrategyRow } from "@/lib/rules/types"
import type { Strategy } from "@/lib/strategy/types"

// What the agent can see of the market while it designs: the stocks that can be bought, and the themes they are grouped in
export type Market = { stocks: Stock[]; categories: StockCategory[] }

// What the agent makes from an idea: a name, the rules it will be held to, the strategy that decides what to hold, and what it read
// and assumed in the idea, to show beside the rules
export type Design = {
  name: string
  rules: RuleSpec[]
  strategy: Strategy
  summary: StrategyRow[]
  assumption: string
  budget: number
}

// What research on a design comes back with: the report to read, and the orders buying it would place
export type Research = { report: Report; orders: Order[] }

// The agent, as the app uses it. The local one stands in for it until Sandworm's is connected: to connect it, make a class that does
// these two things by calling Sandworm, and return it from `getPipeline`. Nothing else in the app changes.
export interface Pipeline {
  design(brief: string, market: Market): Promise<Design>
  research(design: Design & { brief: string }, market: Market): Promise<Research>
}
