import { SWAP_FEE_RATE } from "@/constants/trade"

import { portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

// The most that can go into a stock you hold: the cash there is, and no more than leaves it at its cap
export function buyRoom(portfolio: Portfolio, symbol: string, cap: number) {
  const holding = portfolio.holdings.find((h) => h.symbol === symbol)
  if (!holding) return 0

  const total = portfolioValue(portfolio) ?? 0
  return Math.max(Math.min(portfolio.cash, cap * total - holding.value), 0)
}

// What putting an amount into a stock would do: the fee, how much of it that buys, and how much of the portfolio it is after
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
