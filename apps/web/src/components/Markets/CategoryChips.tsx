import { AppLink } from "@/components/AppLink/AppLink"
import { ALL_TOKENS, categoryCounts, HIGHLIGHTED_TOKENS } from "@/lib/markets/categories"
import type { BaseToken } from "@/lib/markets/tokens"
import { filterPillClassName } from "@/styles/interactive"
import type { CategoryRecord } from "@/types/markets"

import { MoreCategories } from "./MoreCategories"

type CategoryChipsProps = {
  tokens: BaseToken[]
  categories: CategoryRecord[]
  active: string
  keep: Record<string, string>
}

export function CategoryChips({ tokens, categories, active, keep }: CategoryChipsProps) {
  const counted = categoryCounts(tokens, categories)
  const hot = counted.filter(({ isHot }) => isHot)
  const chips = [{ id: ALL_TOKENS, label: "All" }, { id: HIGHLIGHTED_TOKENS, label: "Highlights" }, ...hot]

  return (
    <nav aria-label="Categories" className="-mx-4 flex gap-3 overflow-x-auto px-4 py-2 md:mx-0 md:px-0">
      {chips.map(({ id, label }) => (
        <AppLink
          key={id}
          route="markets"
          query={{ ...keep, category: id }}
          isCurrent={id === active}
          className={filterPillClassName(id === active)}
        >
          {label}
        </AppLink>
      ))}
      <MoreCategories categories={counted.filter(({ isHot }) => !isHot)} active={active} keep={keep} />
    </nav>
  )
}
