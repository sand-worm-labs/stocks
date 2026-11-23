import { AppLink } from "@/components/AppLink/AppLink"
import { ALL_TOKENS, HIGHLIGHTED_TOKENS } from "@/constants/categories"
import { categoryCounts } from "@/lib/markets/categories"
import type { BaseToken } from "@/lib/markets/tokens"
import { filterPillClassName } from "@/styles/interactive"

import { MoreCategories } from "./MoreCategories"

type CategoryChipsProps = {
  tokens: BaseToken[]
  active: string
  // Other choices to keep when one is made, e.g. a search
  keep: Record<string, string>
}

// A row to narrow the list to a group: everything, the highlights, the hot themes, and the rest under "More"
export function CategoryChips({ tokens, active, keep }: CategoryChipsProps) {
  const categories = categoryCounts(tokens)
  const hot = categories.filter(({ isHot }) => isHot)
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
      <MoreCategories categories={categories.filter(({ isHot }) => !isHot)} active={active} keep={keep} />
    </nav>
  )
}
