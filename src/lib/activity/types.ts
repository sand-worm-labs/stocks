import type { RouteId } from "@/config/routes"
import type { ActivityKind } from "@/constants/activity"

export type Activity = {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  at: string
  action?: { label: string; route: RouteId; slug?: string }
  // The rule that was protected, for a refusal
  rule?: string
  // A trade that settled onchain
  onchain?: boolean
}
