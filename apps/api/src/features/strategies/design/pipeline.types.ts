import type { RuleSpec } from "@/features/strategies/rules/spec"
import type { Stock, StockCategory } from "@/features/market/types/market.types"
import type { Order, Report } from "@/features/research/types/report.types"
import type { StrategyRow } from "@/features/strategies/types/rules.types"
import type { Strategy } from "@/features/strategies/types/strategy.types"

export type Market = { stocks: Stock[]; categories: StockCategory[] }

export type Design = {
  name: string
  rules: RuleSpec[]
  strategy: Strategy
  summary: StrategyRow[]
  assumption: string
  budget: number
}

export type Research = { report: Report; orders: Order[] }

export interface Pipeline {
  design(brief: string, market: Market): Promise<Design>
  research(design: Design & { brief: string }, market: Market): Promise<Research>
}
