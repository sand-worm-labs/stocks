import type { Stock, StockCategory } from "@/types/markets"
import { isBuyable } from "./stock"

export function summarizeCategory({ symbols }: StockCategory, stocks: Stock[]) {
  const buyable = stocks.filter((stock) => symbols.includes(stock.symbol) && isBuyable(stock))
  return { buyable, liquidity: buyable.reduce((sum, { liquidity = 0 }) => sum + liquidity, 0) }
}
