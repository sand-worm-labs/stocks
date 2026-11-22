import { PORTFOLIO_PENDING_TEXT, TRADING_MODE_LABEL } from "@/constants/portfolio"
import { searchBy } from "@/lib/search"
import type { Session } from "@/lib/session/types"

import type { Portfolio } from "./types"

export const isLive = (portfolio: Portfolio) => portfolio.status === "live"

// Only a live portfolio has a value: a draft holds nothing yet.
export const portfolioValue = (portfolio: Portfolio) =>
  isLive(portfolio) ? portfolio.holdings.reduce((sum, { value }) => sum + value, portfolio.cash) : undefined

export const heldSymbols = (portfolios: Portfolio[]) =>
  new Set(portfolios.filter(isLive).flatMap(({ holdings }) => holdings.map(({ symbol }) => symbol)))

export function statusText(portfolio: Portfolio, mode: Session["network"]["mode"]) {
  const { status } = portfolio
  return status === "live" ? `Live · ${TRADING_MODE_LABEL[mode].toLowerCase()}` : PORTFOLIO_PENDING_TEXT[status]
}

export function rulesText({ status, rules }: Portfolio) {
  if (!rules) return "draft"
  return status === "live" ? `${rules.passing}/${rules.total}` : `${rules.total - rules.passing} fails`
}

export const searchPortfolios = (portfolios: Portfolio[], query: string) =>
  searchBy(portfolios, query, ({ name, brief }) => `${name} ${brief}`)

// Where a stock is held: the portfolio, its share of that portfolio and what it has gained since it was bought.
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
