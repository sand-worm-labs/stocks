"use client"

import { PiCaretDown } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"

type MoreCategoriesProps = {
  categories: { id: string; label: string; count: number }[]
  active: string
  keep: Record<string, string>
}

// The groups that don't have a chip of their own. When one of them is chosen the button says which.
export function MoreCategories({ categories, active, keep }: MoreCategoriesProps) {
  const chosen = categories.find(({ id }) => id === active)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex flex-none items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none",
          chosen
            ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black"
            : "border-border text-ink-400 hover:text-ink-100 hover:border-primary dark:border-border-tertiary"
        )}
      >
        {chosen ? chosen.label : "More"}
        <PiCaretDown size={12} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="flex max-h-80 w-64 flex-col gap-1 overflow-y-auto p-2">
        {categories.map(({ id, label, count }) => (
          <DropdownMenuItem
            key={id}
            asChild
            className={cn(
              listItemHoverClassName,
              "focus:bg-hover-bg focus:border-hover-border dark:focus:bg-sidebar-hover"
            )}
          >
            <AppLink route="markets" query={{ ...keep, category: id }} isCurrent={id === active}>
              <span>{label}</span>
              <span className="text-ink-400 tabular-nums">{count}</span>
            </AppLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
