import { DEFAULT_SLIPPAGE, NETWORK_FEE, SWAP_FEE_RATE } from "@/constants/trade"

import { portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

// What selling all of a holding would do: what comes back, and what the portfolio looks like afterwards
export function sellQuote(portfolio: Portfolio, symbol: string) {
  const holding = portfolio.holdings.find((h) => h.symbol === symbol)
  if (!holding) return undefined

  const fee = holding.value * SWAP_FEE_RATE
  const receive = holding.value - fee
  const rest = portfolio.holdings.filter((h) => h.symbol !== symbol)
  const total = (portfolioValue(portfolio) ?? 0) - fee - NETWORK_FEE

  return {
    holding,
    fee,
    receive,
    minimum: receive * (1 - DEFAULT_SLIPPAGE),
    realised: receive - holding.cost,
    remaining: rest.length,
    restWeight: rest.length ? rest.reduce((sum, h) => sum + h.value, 0) / rest.length / total : 0,
    cashWeight: (portfolio.cash + receive) / total,
  }
}
