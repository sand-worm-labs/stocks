import type { RouteId } from "@/config/routes"

export const TABS: { route: RouteId; label: string }[] = [
  { route: "markets", label: "Live market" },
  { route: "marketSummary", label: "Summary" },
]
