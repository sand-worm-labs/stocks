import type { ReactNode } from "react"

import { AppLink } from "@/components/AppLink/AppLink"
import type { RouteId } from "@/config/routes"
import { filterPillClassName } from "@/styles/interactive"

type FilterPillsProps = {
  label: string
  route: RouteId
  slug?: string
  param: string
  options: { value: string; label: ReactNode }[]
  active: string
  keep?: Record<string, string>
}

export function FilterPills({ label, route, slug, param, options, active, keep }: FilterPillsProps) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {options.map(({ value, label }) => (
        <AppLink
          key={value}
          route={route}
          slug={slug}
          query={{ ...keep, [param]: value }}
          isCurrent={value === active}
          className={filterPillClassName(value === active)}
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
