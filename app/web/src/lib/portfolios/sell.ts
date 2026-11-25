import { DEFAULT_SLIPPAGE, NETWORK_FEE, SWAP_FEE_RATE } from "@/constants/trade"

import type { Portfolio } from "@/types/portfolios"
import { portfolioValue } from "./portfolio"

export function quoteSale(portfolio: Portfolio, symbols: string[], fraction: number) {
  const selected = portfolio.holdings.filter(({ symbol }) => symbols.includes(symbol))
  if (!selected.length) return undefined

  const sold = selected.reduce((sum, { value }) => sum + value * fraction, 0)
  const fee = sold * SWAP_FEE_RATE
  const receive = sold - fee
  const kept = portfolio.holdings
    .map((holding) => ({
      ...holding,
      value: selected.includes(holding) ? holding.value * (1 - fraction) : holding.value,
    }))
    .filter(({ value }) => value > 0)
  const total = (portfolioValue(portfolio) ?? 0) - fee - NETWORK_FEE

  return {
    held: selected.reduce((sum, { value }) => sum + value, 0),
    fee,
    receive,
    minimum: receive * (1 - DEFAULT_SLIPPAGE),
    realised: receive - selected.reduce((sum, { cost }) => sum + cost * fraction, 0),
    remaining: kept.length,
    restWeight: kept.length ? kept.reduce((sum, { value }) => sum + value, 0) / kept.length / total : 0,
    cashWeight: (portfolio.cash + receive) / total,
  }
}
