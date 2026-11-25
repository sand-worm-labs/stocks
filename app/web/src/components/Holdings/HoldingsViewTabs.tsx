import { AppLink } from "@/components/AppLink/AppLink"
import { VIEWS } from "@/constants/components/holdings/holdings-view-tabs"
import { cn } from "@/lib/utils"
import type { HoldingsView } from "@/types/ui"

export function HoldingsViewTabs({ view, query }: { view: HoldingsView; query: string }) {
  return (
    <nav
      aria-label="View"
      className="border-border-secondary dark:border-border-tertiary flex w-fit gap-1 rounded-full border p-1"
    >
      {VIEWS.map(({ id, label }) => (
        <AppLink
          key={id}
          route="holdings"
          query={{ ...(id === "stocks" && { view: id }), ...(query && { q: query }) }}
          isCurrent={id === view}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            id === view ? "bg-hover-bg text-ink-100" : "text-ink-400 hover:text-ink-100"
          )}
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
