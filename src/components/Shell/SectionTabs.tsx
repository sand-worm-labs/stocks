"use client"

import { AppLink } from "@/components/AppLink/AppLink"
import { ROUTES } from "@/config/routes"
import { SECTIONS } from "@/constants/navigation"
import { useCurrentTab } from "@/hooks/use-current-tab"
import { cn } from "@/lib/utils"

export function SectionTabs({ unreadAlerts }: { unreadAlerts: number }) {
  const current = useCurrentTab(SECTIONS.map(({ route }) => route))

  return (
    <nav aria-label="Sections" className="hidden items-stretch md:flex">
      {SECTIONS.map(({ route, hasAlertCount }) => {
        const isCurrent = route === current

        return (
          <AppLink
            key={route}
            route={route}
            isCurrent={isCurrent}
            className={cn(
              "relative inline-flex min-h-14 items-center gap-1.5 px-3 text-sm transition-colors",
              isCurrent ? "text-ink-100 font-medium" : "text-ink-400 hover:text-ink-100"
            )}
          >
            {ROUTES[route].label}
            {hasAlertCount && unreadAlerts > 0 && (
              <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]">
                {unreadAlerts}
              </span>
            )}
            {isCurrent && <span className="bg-ink-100 absolute inset-x-3 -bottom-px h-0.5" />}
          </AppLink>
        )
      })}
    </nav>
  )
}
