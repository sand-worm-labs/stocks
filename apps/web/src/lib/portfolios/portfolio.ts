import { DRAFT_STAGE, PORTFOLIO_PENDING_TEXT } from "@/constants/portfolio"
import { searchBy } from "@/lib/search"

import type { Portfolio } from "@/types/portfolios"

export const isLive = (portfolio: Portfolio) => portfolio.status === "live"

// Only a live portfolio has a value: a draft holds nothing yet.
export const portfolioValue = (portfolio: Portfolio) =>
  isLive(portfolio) ? portfolio.holdings.reduce((sum, { value }) => sum + value, portfolio.cash) : undefined

// The live portfolios, biggest first: the order a model's colour and its place on the page follow
export const rankByValue = (portfolios: Portfolio[]) =>
  portfolios.filter(isLive).toSorted((a, b) => (portfolioValue(b) ?? 0) - (portfolioValue(a) ?? 0))

export const heldSymbols = (portfolios: Portfolio[]) =>
  new Set(portfolios.filter(isLive).flatMap(({ holdings }) => holdings.map(({ symbol }) => symbol)))

export function statusText(portfolio: Portfolio) {
  const { status } = portfolio
  if (status === "live") return "Live"
  if (status === "closed") return "Closed"
  return status === "draft" && portfolio.stage ? DRAFT_STAGE[portfolio.stage].label : PORTFOLIO_PENDING_TEXT[status]
}

export const searchPortfolios = (portfolios: Portfolio[], query: string) =>
  searchBy(portfolios, query, ({ name, brief }) => `${name} ${brief}`)

export const exposureTo = (portfolios: Portfolio[], symbol: string) =>
  portfolios.filter(isLive).flatMap((portfolio) => {
    const holding = portfolio.holdings.find((h) => h.symbol === symbol)
    if (!holding) return []

    return {
      portfolio,
      value: holding.value,
      weight: holding.value / (portfolioValue(portfolio) ?? holding.value),
      gain: holding.value - holding.cost,
      gainRate: holding.value / holding.cost - 1,
    }
  })
