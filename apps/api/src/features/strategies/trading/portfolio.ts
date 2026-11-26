import type { Portfolio } from "@/features/strategies/types/holding.types"

export const isLive = (portfolio: Portfolio) => portfolio.status === "live"

// Only a live portfolio has a value: a draft holds nothing yet.
export const portfolioValue = (portfolio: Portfolio) =>
  isLive(portfolio) ? portfolio.holdings.reduce((sum, { value }) => sum + value, portfolio.cash) : undefined
