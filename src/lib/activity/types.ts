import type { RouteId } from "@/config/routes"
import type { ActivityKind } from "@/constants/activity"

// A trade as it settled: what went in, what came out and what it cost
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
  action?: { label: string; route: RouteId; slug?: string }
  // The rule that was protected, for a refusal, and what was asked of it
  rule?: string
  request?: string
  trade?: TradeReceipt
  // A check of the rules: how many held
  checks?: { passing: number; total: number }
}
