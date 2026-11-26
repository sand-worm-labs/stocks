import type { ActivityKind } from "./activity-kind"

export type TradeReceipt = {
  symbol: string
  side: "buy" | "sell"
  spend: number
  units: number
  price: number
  fee: number
  impact: number
  tx: string
}

export type Activity = {
  id: string
  portfolioId: string
  kind: ActivityKind
  title: string
  detail: string
  at: string
  // `route` is the web app's name for the page: the only one pointed at is a strategy's
  action?: { label: string; route: "portfolio"; slug?: string }
  rule?: string
  request?: string
  trade?: TradeReceipt
  checks?: { passing: number; total: number }
}
