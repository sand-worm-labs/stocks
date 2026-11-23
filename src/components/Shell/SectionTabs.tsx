"use client"

import { AppLink } from "@/components/AppLink/AppLink"
import { ROUTES } from "@/config/routes"
import { SECTIONS } from "@/constants/navigation"
import { useCurrentTab } from "@/hooks/use-current-tab"
import { cn } from "@/lib/utils"

export function SectionTabs({ unreadAlerts }: { unreadAlerts: number }) {
  const current = useCurrentTab(SECTIONS.map(({ route }) => route))

  return (
    <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
      {SECTIONS.map(({ route, hasAlertCount }) => {
        const isCurrent = route === current

        return (
          <AppLink
            key={route}
            route={route}
            isCurrent={isCurrent}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-normal transition-colors",
              isCurrent ? "bg-hover-bg text-ink-100" : "text-ink-200 hover:bg-hover-bg/60 hover:text-ink-100"
            )}
          >
            {ROUTES[route].label}
            {hasAlertCount && unreadAlerts > 0 && (
              <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]">
                {unreadAlerts}
              </span>
            )}
          </AppLink>
        )
      })}
    </nav>
  )
}
