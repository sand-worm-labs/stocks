import type { RouteId } from "@/config/routes"
import type { ActivityKind } from "@/constants/activity"

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
  rule?: string
  request?: string
  trade?: TradeReceipt
  checks?: { passing: number; total: number }
}
