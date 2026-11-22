import { AppLink } from "@/components/AppLink/AppLink"
import { ALL_TOKENS, HIGHLIGHTED_TOKENS } from "@/constants/categories"
import { categoryCounts } from "@/lib/markets/categories"
import type { BaseToken } from "@/lib/markets/tokens"
import { cn } from "@/lib/utils"

type CategoryChipsProps = {
  tokens: BaseToken[]
  active: string
  // Other choices to keep when one is made, e.g. a search
  keep?: Record<string, string>
}

// A row of groups to narrow the list to, the hot ones marked
export function CategoryChips({ tokens, active, keep }: CategoryChipsProps) {
  const chips = [
    { id: ALL_TOKENS, label: "All", emoji: "" },
    { id: HIGHLIGHTED_TOKENS, label: "Highlights", emoji: "✨" },
    ...categoryCounts(tokens).map(({ id, label, emoji, count }) => ({ id, label, emoji, count })),
  ]

  return (
    <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {chips.map(({ id, label, emoji }) => (
        <AppLink
          key={id}
          route="markets"
          query={{ ...keep, category: id }}
          isCurrent={id === active}
          className={cn(
            "flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            id === active
              ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black"
              : "border-border text-ink-400 hover:text-ink-100 hover:border-primary dark:border-border-tertiary"
          )}
        >
          {emoji && <span aria-hidden="true">{emoji}</span>}
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
