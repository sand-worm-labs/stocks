import { AppLink } from "@/components/AppLink/AppLink"
import { cn } from "@/lib/utils"

export type HoldingsTab = "list" | "summary"

const TABS: { id: HoldingsTab; label: string }[] = [
  { id: "list", label: "List" },
  { id: "summary", label: "Summary" },
]

// The two halves of the page, as the market has them: the list first, the totals and the heatmap second. The list keeps the
// way it was being read, and a search, only while it is the list.
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
