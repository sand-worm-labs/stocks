import type { Category, CategoryRecord, MarketSummary, Stock, StockDetail } from "@/features/market/types/market.types"
import { isBuyable, underlyingTicker } from "./stock"

const BASE_DOCS = { name: "base.org", url: "https://docs.base.org/sdks/tokenized-stocks/overview", title: "Base · tokenized stocks" }

// A category's stocks among those on offer. A ticker nothing is listed for yet is left out until it is.
export function categoryOf(record: CategoryRecord, stocks: Stock[]): Category {
  const listed = record.tickers.flatMap((ticker) => stocks.find(({ symbol }) => underlyingTicker(symbol) === ticker) ?? [])
  return {
    ...record,
    symbols: listed.filter(isBuyable).map(({ symbol }) => symbol),
    unavailable: listed.filter((stock) => !isBuyable(stock)).map(({ symbol }) => symbol),
  }
}

// What the page for one stock says about it, from what is known of its token and company, and nothing that is not
export function detailOf(stock: Stock): StockDetail {
  return {
    issuer: stock.sources?.includes("coinbase") ? "Coinbase · B20" : "Tokenized on Base",
    ownership: "Price exposure, no votes",
    tradingHours: "24/7 · shares Mon–Fri",
    sources: [BASE_DOCS],
    description: stock.description,
    sector: stock.sector,
    industry: stock.industry,
    knowledge: [],
  }
}

// The stocks the product offers, as the universe lists them
export function createStockSource(universe: () => Promise<Stock[]>, categoryRecords: () => Promise<CategoryRecord[]>) {
  const getStocks = universe

  return {
    getStocks,
    async getMarketSummary(): Promise<MarketSummary> {
      const stocks = await getStocks()
      return { listed: stocks.length, buyable: stocks.filter(isBuyable).length, asOf: new Date().toISOString(), source: BASE_DOCS }
    },
    async getStockDetail(symbol: string) {
      const stock = (await getStocks()).find((found) => found.symbol === symbol)
      return stock && isBuyable(stock) ? { stock, detail: detailOf(stock) } : undefined
    },
    async getCategories(): Promise<Category[]> {
      const [records, stocks] = await Promise.all([categoryRecords(), getStocks()])
      return records.map((record) => categoryOf(record, stocks))
    },
  }
}

export type StockSource = ReturnType<typeof createStockSource>
