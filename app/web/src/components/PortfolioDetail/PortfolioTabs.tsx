import { AppLink } from "@/components/AppLink/AppLink"

import { TABS } from "@/constants/components/portfolio-detail/portfolio-tabs"
import type { PortfolioTab } from "@/types/ui"

export function PortfolioTabs({ portfolioId, current }: { portfolioId: string; current: PortfolioTab }) {
  return (
    <nav aria-label="Strategy" className="border-border-secondary dark:border-border-tertiary flex gap-1 border-b">
      {TABS.map(({ id, route, label }) => (
        <AppLink
          key={id}
          route={route}
          slug={portfolioId}
          isCurrent={id === current}
          className="text-ink-400 hover:text-ink-100 aria-[current=page]:text-ink-100 aria-[current=page]:border-ink-100 -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors"
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
