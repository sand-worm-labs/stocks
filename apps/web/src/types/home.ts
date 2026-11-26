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

export type LiveStock = import("@/types/markets").Stock & {
  address?: string
  heldIn?: number
  share?: number
}
