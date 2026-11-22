import type { PortfolioStatus } from "@/constants/portfolio"

// What it is worth now, and what was paid for it
export type Holding = { symbol: string; units: number; value: number; cost: number }

export type Portfolio = {
  id: string
  name: string
  // What the owner asked for, in their words
  brief: string
  status: PortfolioStatus
  holdings: Holding[]
  cash: number
  startedAt?: string
  // Fractions: 0.008 is +0.8%
  weekChange?: number
  worstDip?: number
  rules?: { passing: number; total: number; checkedAt: string }
  series: number[]
  note?: string
  // What an unbuildable brief asked for: this many stocks, each at least this share
  constraint?: { positions: number; minimum: number }
}
