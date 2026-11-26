import { type RouteId, ROUTES } from "@/config/routes"

// The tab a page belongs to: the one whose path is the longest start of the page's path, so a portfolio's report
// is under Portfolios, and /strategies/new is under "New".
export function currentTab(tabs: RouteId[], pathname: string) {
  return tabs
    .filter((route) => {
      const { path } = ROUTES[route]
      return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
    })
    .sort((a, b) => ROUTES[b].path.length - ROUTES[a].path.length)[0]
}
