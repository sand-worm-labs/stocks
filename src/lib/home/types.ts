import type { RouteId } from "@/config/routes"
import type { Tone } from "@/constants/tone"

export type AttentionItem = {
  id: string
  title: string
  detail: string
  action: { label: string; route: RouteId; slug?: string }
}

// `amount` is the number the value was written from, for something that moves it
export type Kpi = { id: string; label: string; value: string; caption: string; tone?: Tone; amount?: number }

// A stock with the contract it trades as on Base, to read its price from the live market
export type LiveStock = import("@/lib/markets/types").Stock & {
  address?: string
  // For a stock held: in how many models, and its share of everything held in stocks
  heldIn?: number
  share?: number
}
