import type { RuleSpec } from "@/lib/rules/spec"
import type { Stock, StockCategory } from "@/types/markets"
import type { Order, Report } from "@/types/report"
import type { StrategyRow } from "@/types/rules"
import type { Strategy } from "@/types/strategy"

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
