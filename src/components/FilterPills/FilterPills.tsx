import { AppLink } from "@/components/AppLink/AppLink"
import type { RouteId } from "@/config/routes"
import { cn } from "@/lib/utils"

type FilterPillsProps = {
  label: string
  route: RouteId
  slug?: string
  // The search param the choice lives in, so a choice is a link and survives a reload
  param: string
  options: { value: string; label: string }[]
  active: string
  // Other params to keep when a choice is made, e.g. a search
  keep?: Record<string, string>
}

export function FilterPills({ label, route, slug, param, options, active, keep }: FilterPillsProps) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {options.map(({ value, label }) => (
        <AppLink
          key={value}
          route={route}
          slug={slug}
          query={{ ...keep, [param]: value }}
          isCurrent={value === active}
          className={cn(
            "flex-none rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            value === active
              ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black"
              : "border-border text-ink-400 hover:text-ink-100 dark:border-border-tertiary"
          )}
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
