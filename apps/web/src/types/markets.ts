export type Stock = {
  symbol: string
  name: string
  // A stock with no price or liquidity is listed, but has no token to buy yet.
  price?: number
  liquidity?: number
  series?: number[]
  // Not listed on an exchange yet, so there is no share price to test against
  preIpo?: boolean
  // What the token is, from the list of tokenized stocks on Base and the company's profile
  address?: string
  isin?: string
  sector?: string
  industry?: string
  description?: string
  totalSupply?: number
  firstMintDate?: string
  sources?: string[]
  // The share's change over the month, as a fraction, once it has been looked up
  monthChange?: number
  dayChange?: number
}

export type MarketSummary = {
  listed: number
  buyable: number
  asOf: string
  source: Source
}

export type Source = { name: string; url: string; title: string }

export type Knowledge = { id: string; kind: "fact" | "opinion"; text: string; source?: Source }

export type StockDetail = {
  issuer: string
  ownership: string
  tradingHours: string
  sources: Source[]
  description?: string
  sector?: string
  industry?: string
  knowledge: Knowledge[]
  // Missing until there is enough history to measure
  risk?: { beta: number; worstDrop: number }
}

// A category as it is kept: its stocks by their shares' tickers
export type CategoryRecord = { id: string; label: string; isHot: boolean; isInterest: boolean; tickers: string[] }

// A category against the stocks on offer: the ones that can be bought, and the ones listed with no token yet
export type StockCategory = { id: string; label: string; symbols: string[]; unavailable?: string[] }

// What the API answers with
export type Category = CategoryRecord & StockCategory
