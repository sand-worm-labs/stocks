import { isBuyable } from "./stock"
import type { Stock, StockCategory } from "./types"

// The stocks of a category that have a token, and how much liquidity they have between them
export function summarizeCategory({ symbols }: StockCategory, stocks: Stock[]) {
  const buyable = stocks.filter((stock) => symbols.includes(stock.symbol) && isBuyable(stock))
  return { buyable, liquidity: buyable.reduce((sum, { liquidity = 0 }) => sum + liquidity, 0) }
}
