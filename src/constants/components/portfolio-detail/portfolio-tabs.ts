import type { RouteId } from "@/config/routes"
import type { PortfolioTab } from "@/types/ui"

export const TABS: { id: PortfolioTab | "report"; route: RouteId; label: string }[] = [
  { id: "overview", route: "portfolio", label: "Overview" },
  { id: "rules", route: "rules", label: "Rules" },
  { id: "activity", route: "portfolioActivity", label: "Activity" },
  { id: "report", route: "report", label: "Results" },
]
