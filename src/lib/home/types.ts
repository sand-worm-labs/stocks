import type { RouteId } from "@/config/routes"
import type { Tone } from "@/constants/tone"

export type AttentionItem = {
  id: string
  tone: Extract<Tone, "warning" | "negative" | "info">
  title: string
  detail: string
  action: { label: string; route: RouteId; slug?: string }
}

export type Idea = { id: string; title: string; hint: string }

export type Kpi = { id: string; label: string; value: string; caption: string; tone?: Tone }
