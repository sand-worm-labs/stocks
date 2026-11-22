import { AppLink } from "@/components/AppLink/AppLink"
import type { RouteId } from "@/config/routes"
import { cn } from "@/lib/utils"

const TABS: { route: RouteId; label: string }[] = [
  { route: "brief", label: "Describe it" },
  { route: "stockPicker", label: "Stocks or a category" },
]

export function BriefTabs({ current }: { current: RouteId }) {
  return (
    <nav
      aria-label="How to start"
      className="border-border-secondary dark:border-border-tertiary flex gap-1 self-start rounded-full border p-1"
    >
      {TABS.map(({ route, label }) => (
        <AppLink
          key={route}
          route={route}
          isCurrent={route === current}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            route === current
              ? "bg-base-400 text-primary-foreground dark:bg-white dark:text-black"
              : "text-ink-400 hover:text-ink-100"
          )}
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
