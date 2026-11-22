import { categoriesMockData } from "@/_mockdata/categories"
import { marketSummaryMockData } from "@/_mockdata/markets"
import { stockDetailMock } from "@/_mockdata/stock-details"
import { stocksMockData } from "@/_mockdata/stocks"

import { getQuotes } from "./quote"
import { isBuyable, underlyingTicker } from "./stock"
import type { MarketSummary, Stock, StockCategory } from "./types"

// The listed stocks, each with its share's real price and name from the market data feed
export async function getStocks(): Promise<Stock[]> {
  const quotes = await getQuotes(stocksMockData.filter(({ preIpo }) => !preIpo).map(({ symbol }) => symbol))

  return stocksMockData.map((stock) => {
    const quote = quotes.get(underlyingTicker(stock.symbol))
    return quote
      ? {
          ...stock,
          name: quote.name ?? stock.name,
          price: quote.price,
          monthChange: quote.monthChange,
          dayChange: quote.dayChange,
          series: quote.series,
        }
      : stock
  })
}

export async function getMarketSummary(): Promise<MarketSummary> {
  return marketSummaryMockData
}

// A stock with no token to buy has no page
export async function getStockDetail(symbol: string) {
  const stock = (await getStocks()).find((s) => s.symbol === symbol)
  return stock && isBuyable(stock) ? { stock, detail: stockDetailMock(stock) } : undefined
}

export async function getCategories(): Promise<StockCategory[]> {
  return categoriesMockData
}
