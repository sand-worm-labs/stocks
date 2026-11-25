import type { Stock } from "@/types/markets"

import type { Portfolio } from "@/types/portfolios"
import { isLive } from "./portfolio"

const round = (value: number) => Math.round(value * 100) / 100

export function markToMarket(portfolio: Portfolio, stocks: Pick<Stock, "symbol" | "price">[]): Portfolio {
  if (!isLive(portfolio)) return portfolio

  return {
    ...portfolio,
    holdings: portfolio.holdings.map((holding) => {
      const price = stocks.find(({ symbol }) => symbol === holding.symbol)?.price

      return {
        ...holding,
        cost: round(holding.units * holding.entryPrice),
        value: price === undefined ? holding.value : round(holding.units * price),
      }
    }),
  }
}
