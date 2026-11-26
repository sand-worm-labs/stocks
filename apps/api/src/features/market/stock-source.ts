import { marketSummaryMockData } from "@/_mockdata/markets"
import { stockDetailMock } from "@/_mockdata/stock-details"
import { stocksMockData } from "@/_mockdata/stocks"

import type { Category, CategoryRecord, MarketSummary, Stock } from "@/features/market/types/market.types"
import { isBuyable, underlyingTicker } from "./stock"

type Quote = { price: number; name?: string; monthChange?: number; dayChange?: number; series: number[] }

// Where a share's price comes from: the market feature
export type QuotesOf = (tickers: string[]) => Promise<Record<string, Quote>>

// A category's stocks among those on offer. A ticker nothing is listed for yet is left out until it is.
export function categoryOf(record: CategoryRecord, stocks: Stock[]): Category {
  const listed = record.tickers.flatMap((ticker) => stocks.find(({ symbol }) => underlyingTicker(symbol) === ticker) ?? [])
  return {
    ...record,
    symbols: listed.filter(isBuyable).map(({ symbol }) => symbol),
    unavailable: listed.filter((stock) => !isBuyable(stock)).map(({ symbol }) => symbol),
  }
}

// The stocks the product offers, each with its share's price on top
export function createStockSource(quotesOf: QuotesOf, categoryRecords: () => Promise<CategoryRecord[]>) {
  async function getStocks(): Promise<Stock[]> {
    const tickers = stocksMockData.filter(({ preIpo }) => !preIpo).map(({ symbol }) => underlyingTicker(symbol))
    const quotes = await quotesOf([...new Set(tickers)])

    return stocksMockData.map((stock) => {
      const quote = quotes[underlyingTicker(stock.symbol)]
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

  return {
    getStocks,
    async getMarketSummary(): Promise<MarketSummary> {
      return marketSummaryMockData
    },
    async getStockDetail(symbol: string) {
      const stock = (await getStocks()).find((found) => found.symbol === symbol)
      return stock && isBuyable(stock) ? { stock, detail: stockDetailMock(stock) } : undefined
    },
    async getCategories(): Promise<Category[]> {
      const [records, stocks] = await Promise.all([categoryRecords(), getStocks()])
      return records.map((record) => categoryOf(record, stocks))
    },
  }
}

export type StockSource = ReturnType<typeof createStockSource>
