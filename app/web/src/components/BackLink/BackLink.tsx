import { PiArrowLeft } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { type RouteId, ROUTES } from "@/config/routes"

export function BackLink({ route }: { route: RouteId }) {
  return (
    <AppLink
      route={route}
      className="text-ink-400 hover:text-ink-100 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
    >
      <PiArrowLeft aria-hidden="true" />
      {ROUTES[route].label}
    </AppLink>
  )
}
