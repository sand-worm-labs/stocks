import Link from "next/link"
import type { ReactNode } from "react"

import { routeHref, type RouteId } from "@/config/routes"

type AppLinkProps = {
  route: RouteId
  // A page under the route, e.g. a stock's symbol
  slug?: string
  query?: Record<string, string>
  isCurrent?: boolean
  className?: string
  children: ReactNode
}

// A link to a page of this app. A page that isn't built has nowhere to go, so it is plain text, not a dead link.
export function AppLink({ route, slug, query, isCurrent, className, children }: AppLinkProps) {
  const href = routeHref(route, query, slug)

  if (!href) {
    return (
      <span aria-disabled="true" className={className}>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} aria-current={isCurrent ? "page" : undefined} className={className}>
      {children}
    </Link>
  )
}
