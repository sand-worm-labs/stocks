type RouteDefinition = {
  path: string
  label: string
  isBuilt: boolean
  // A fixed page under a slug: /portfolios/<id>/<suffix>
  suffix?: string
}

export const ROUTES = {
  home: { path: "/", label: "Home", isBuilt: true },
  portfolios: { path: "/portfolios", label: "Portfolios", isBuilt: true },
  portfolio: { path: "/portfolios", label: "Portfolio", isBuilt: true },
  newPortfolio: { path: "/portfolios/new", label: "New portfolio", isBuilt: true },
  brief: { path: "/portfolios/new/brief", label: "Brief", isBuilt: true },
  stockPicker: { path: "/portfolios/new/stocks", label: "Stocks or a category", isBuilt: true },
  rules: { path: "/portfolios", suffix: "rules", label: "Rules", isBuilt: true },
  research: { path: "/portfolios", suffix: "research", label: "Research", isBuilt: true },
  report: { path: "/portfolios", suffix: "report", label: "Report", isBuilt: true },
  adapt: { path: "/portfolios", suffix: "adapt", label: "Adapt", isBuilt: true },
  buy: { path: "/portfolios", suffix: "buy", label: "Buy", isBuilt: true },
  markets: { path: "/markets", label: "Markets", isBuilt: true },
  marketSummary: { path: "/markets/summary", label: "Summary", isBuilt: true },
  stock: { path: "/markets", label: "Stock", isBuilt: true },
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
