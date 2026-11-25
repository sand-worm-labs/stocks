import Link from "next/link"
import type { ReactNode } from "react"

import { routeHref, type RouteId } from "@/config/routes"

type AppLinkProps = {
  route: RouteId
  slug?: string
  query?: Record<string, string>
  isCurrent?: boolean
  className?: string
  tour?: string
  children: ReactNode
}

// A link to a page of this app. A page that isn't built has nowhere to go, so it is plain text, not a dead link.
export function AppLink({ route, slug, query, isCurrent, className, tour, children }: AppLinkProps) {
  const href = routeHref(route, query, slug)

  if (!href) {
    return (
      <span aria-disabled="true" data-tour={tour} className={className}>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} aria-current={isCurrent ? "page" : undefined} data-tour={tour} className={className}>
      {children}
    </Link>
  )
}
