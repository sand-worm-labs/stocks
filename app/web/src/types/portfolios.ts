import type { DraftStage, PortfolioStatus } from "@/constants/portfolio"

// What it is worth now, and what was paid for it: `entryPrice` is a unit's price when it was bought, so `cost` is the
// units times that, and `value` is the units at today's price
export type Holding = { symbol: string; units: number; entryPrice: number; value: number; cost: number }

export type Portfolio = {
  id: string
  name: string
  brief: string
  status: PortfolioStatus
  stage?: DraftStage
  createdAt: string
  holdings: Holding[]
  // Made by this person here, so its money can really be moved; the others are made-up
  own?: boolean
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
