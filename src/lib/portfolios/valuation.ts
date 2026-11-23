import type { Stock } from "@/lib/markets/types"

import { isLive } from "./portfolio"
import type { Portfolio } from "./types"

const round = (value: number) => Math.round(value * 100) / 100

// A live portfolio at today's prices: what each stock cost is its units at the price it was bought at, and what it is
// worth is its units at the price the market gives now. A stock with no price now keeps the value it had.
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
