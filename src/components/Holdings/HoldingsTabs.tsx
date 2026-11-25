import { AppLink } from "@/components/AppLink/AppLink"
import { TABS } from "@/constants/components/holdings/holdings-tabs"
import { cn } from "@/lib/utils"
import type { HoldingsTab } from "@/types/ui"

export function HoldingsTabs({ current }: { current: HoldingsTab }) {
  return (
    <nav
      aria-label="Holdings"
      className="border-border-secondary dark:border-border-tertiary flex gap-1 self-start rounded-full border p-1"
    >
      {TABS.map(({ id, label }) => (
        <AppLink
          key={id}
          route="holdings"
          query={id === "summary" ? { tab: id } : {}}
          isCurrent={id === current}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            id === current
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
