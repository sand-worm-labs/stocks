"use client"

import { AppLink } from "@/components/AppLink/AppLink"
import { ROUTES } from "@/config/routes"
import { MOBILE_TABS } from "@/constants/navigation"
import { useCurrentTab } from "@/hooks/use-current-tab"
import { cn } from "@/lib/utils"

export function BottomNav({ unreadAlerts }: { unreadAlerts: number }) {
  const current = useCurrentTab(MOBILE_TABS.map(({ route }) => route))

  return (
    <nav
      aria-label="Sections"
      className="border-border-secondary bg-block-surface dark:border-border-tertiary fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] select-none md:hidden"
    >
      <ul className="flex h-16">
        {MOBILE_TABS.map(({ route, icon: Icon, hasAlertCount }) => {
          const isCurrent = route === current
          const isNew = route === "newPortfolio"

          return (
            <li key={route} className="flex-1">
              <AppLink
                route={route}
                isCurrent={isCurrent}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isCurrent ? "text-ink-100" : "text-ink-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 items-center justify-center",
                    isNew && "bg-base-400 text-primary-foreground w-10 rounded-xl dark:bg-white dark:text-black"
                  )}
                >
                  <Icon size={isNew ? 18 : 22} aria-hidden="true" />
                </span>
                {ROUTES[route].label.replace(" portfolio", "")}
                {hasAlertCount && unreadAlerts > 0 && (
                  <span className="bg-primary text-primary-foreground absolute top-1 left-1/2 ml-2 min-w-4 rounded-full px-1 text-center text-[10px] leading-4">
                    {unreadAlerts}
                  </span>
                )}
              </AppLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
