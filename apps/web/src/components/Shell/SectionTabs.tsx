"use client"

import { AppLink } from "@/components/AppLink/AppLink"
import { useNotifications } from "@/components/Notifications/NotificationsProvider"
import { ROUTES } from "@/config/routes"
import { SECTIONS } from "@/constants/navigation"
import { useCurrentTab } from "@/hooks/use-current-tab"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"

export function SectionTabs() {
  const { unread } = useNotifications()
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
            tour={`nav-${route}`}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 px-3 text-sm font-normal",
              isCurrent
                ? "border-hover-border bg-hover-bg text-ink-100 rounded-[10px] border dark:border-transparent"
                : cn(listItemHoverClassName, "text-ink-200 hover:text-ink-100")
            )}
          >
            {ROUTES[route].label}
            {hasAlertCount && unread > 0 && (
              <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]">
                {unread}
              </span>
            )}
          </AppLink>
        )
      })}
    </nav>
  )
}
