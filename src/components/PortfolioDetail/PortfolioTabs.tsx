import { AppLink } from "@/components/AppLink/AppLink"
import type { RouteId } from "@/config/routes"

const TABS: { route: RouteId; label: string }[] = [
  { route: "portfolio", label: "Overview" },
  { route: "report", label: "Research report" },
  { route: "rules", label: "Rules" },
  { route: "activity", label: "Activity" },
]

export function PortfolioTabs({ portfolioId }: { portfolioId: string }) {
  return (
    <nav aria-label="Portfolio" className="border-border-secondary dark:border-border-tertiary flex gap-1 border-b">
      {TABS.map(({ route, label }, i) => (
        <AppLink
          key={route}
          route={route}
          slug={route === "activity" ? undefined : portfolioId}
          isCurrent={i === 0}
          className="text-ink-400 hover:text-ink-100 aria-[current=page]:text-ink-100 aria-[current=page]:border-ink-100 -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors"
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
