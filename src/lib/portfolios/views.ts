import { returnOnDeposit } from "./performance"
import { isLive, portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

// The ways to narrow the list of portfolios, and how to order what is left
export const PORTFOLIO_VIEWS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "drafts", label: "Drafts" },
  { id: "winning", label: "Winning" },
  { id: "losing", label: "Losing" },
] as const
export type PortfolioView = (typeof PORTFOLIO_VIEWS)[number]["id"]

export const PORTFOLIO_SORTS = [
  { id: "profit", label: "Most profitable" },
  { id: "value", label: "Biggest" },
  { id: "newest", label: "Newest" },
] as const
export type PortfolioSort = (typeof PORTFOLIO_SORTS)[number]["id"]

export const inView = (portfolio: Portfolio, view: PortfolioView) => {
  if (view === "live") return isLive(portfolio)
  if (view === "drafts") return portfolio.status === "draft"
  if (view === "winning") return isLive(portfolio) && returnOnDeposit(portfolio) > 0
  if (view === "losing") return isLive(portfolio) && returnOnDeposit(portfolio) < 0
  return true
}

// How many each view would show, for the number on its chip
export const countsByView = (portfolios: Portfolio[]) =>
  Object.fromEntries(PORTFOLIO_VIEWS.map(({ id }) => [id, portfolios.filter((p) => inView(p, id)).length])) as Record<
    PortfolioView,
    number
  >

// The portfolios in the order a sort asks for, a draft (which has nothing to rank by) after the live ones
export function sortPortfolios(portfolios: Portfolio[], sort: PortfolioSort) {
  const key = (portfolio: Portfolio) =>
    sort === "newest"
      ? new Date(portfolio.createdAt).getTime()
      : isLive(portfolio)
        ? sort === "profit"
          ? returnOnDeposit(portfolio)
          : (portfolioValue(portfolio) ?? 0)
        : Number.NEGATIVE_INFINITY

  return portfolios.toSorted((a, b) => key(b) - key(a))
}
