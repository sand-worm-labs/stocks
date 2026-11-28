import { fromMarket } from "@/lib/api/market"
import type { Category, MarketSummary, Stock, StockDetail } from "@/types/markets"

// All of it comes from the Stocks API, which lists the stocks on Base from the places that issue them and knows each one's pool and sector. Without
// it the pages still draw, with none.
export const getStocks = () => fromMarket<Stock[]>("/market/stocks", [])

const NO_SUMMARY: MarketSummary = {
  listed: 0,
  buyable: 0,
  asOf: new Date(0).toISOString(),
  source: { name: "base.org", url: "https://docs.base.org/sdks/tokenized-stocks/overview", title: "Base · tokenized stocks" },
}

export const getMarketSummary = () => fromMarket<MarketSummary>("/market/summary", NO_SUMMARY)

export const getStockDetail = (symbol: string) =>
  fromMarket<{ stock: Stock; detail: StockDetail } | undefined>(`/market/stocks/${encodeURIComponent(symbol)}`, undefined)

// Kept in the database, and read from the API
export const getCategories = () => fromMarket<Category[]>("/market/categories", [])
