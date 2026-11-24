type RouteDefinition = {
  path: string
  label: string
  isBuilt: boolean
  // A fixed page under a slug: /strategies/<id>/<suffix>
  suffix?: string
}

export const ROUTES = {
  home: { path: "/", label: "Home", isBuilt: true },
  portfolios: { path: "/strategies", label: "Strategies", isBuilt: true },
  portfolio: { path: "/strategies", label: "Strategy", isBuilt: true },
  newPortfolio: { path: "/strategies/new", label: "New strategy", isBuilt: true },
  brief: { path: "/strategies/new/brief", label: "Idea", isBuilt: true },
  stockPicker: { path: "/strategies/new/stocks", label: "Stocks or a category", isBuilt: true },
  rules: { path: "/strategies", suffix: "rules", label: "Rules", isBuilt: true },
  research: { path: "/strategies", suffix: "research", label: "Research", isBuilt: true },
  report: { path: "/strategies", suffix: "report", label: "Results", isBuilt: true },
  adapt: { path: "/strategies", suffix: "adapt", label: "Refine", isBuilt: true },
  buy: { path: "/strategies", suffix: "buy", label: "Trade", isBuilt: true },
  portfolioActivity: { path: "/strategies", suffix: "activity", label: "Activity", isBuilt: true },
  markets: { path: "/markets", label: "Markets", isBuilt: true },
  marketSummary: { path: "/markets/summary", label: "Summary", isBuilt: true },
  stock: { path: "/markets", label: "Stock", isBuilt: true },
  holdings: { path: "/holdings", label: "Holdings", isBuilt: true },
  activity: { path: "/activity", label: "Activity", isBuilt: true },
  settings: { path: "/settings", label: "Settings", isBuilt: true },
} as const satisfies Record<string, RouteDefinition>

export type RouteId = keyof typeof ROUTES

// The address a link to `route` goes to, or null when there is nowhere to go. A page that isn't built yet sends
// people to the section it belongs to, if it has one.
export function routeHref(route: RouteId, query?: Record<string, string>, slug?: string): string | null {
  const { isBuilt, path, ...rest } = ROUTES[route] as RouteDefinition
  if (!isBuilt) return null

  const suffix = "suffix" in rest ? rest.suffix : undefined
  const search = query ? `?${new URLSearchParams(query)}` : ""
  return `${[path === "/" ? "" : path, slug, suffix].filter(Boolean).join("/") || "/"}${search}`
}
