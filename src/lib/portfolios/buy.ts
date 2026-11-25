import { SWAP_FEE_RATE } from "@/constants/trade"

import type { Portfolio } from "@/types/portfolios"
import { portfolioValue } from "./portfolio"

export function buyRoom(portfolio: Portfolio, symbol: string, cap: number) {
  const holding = portfolio.holdings.find((h) => h.symbol === symbol)
  if (!holding) return 0

  const total = portfolioValue(portfolio) ?? 0
  return Math.max(Math.min(portfolio.cash, cap * total - holding.value), 0)
}

export function quoteBuy(portfolio: Portfolio, symbol: string, amount: number) {
  const holding = portfolio.holdings.find((h) => h.symbol === symbol)
  if (!holding) return undefined

  const price = holding.value / holding.units
  const fee = amount * SWAP_FEE_RATE
  const bought = amount - fee
  const total = portfolioValue(portfolio) ?? 0

  return {
    price,
    fee,
    units: bought / price,
    weight: total ? (holding.value + bought) / (total - fee) : 0,
    cashAfter: portfolio.cash - amount,
  }
}
