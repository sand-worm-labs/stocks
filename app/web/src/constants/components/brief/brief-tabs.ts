import type { RouteId } from "@/config/routes"

export const TABS: { route: RouteId; label: string }[] = [
  { route: "brief", label: "Describe it" },
  { route: "stockPicker", label: "Stocks or a category" },
]
