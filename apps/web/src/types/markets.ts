import type { StockTheme } from "@/constants/markets"

export type Stock = {
  symbol: string
  name: string
  // A stock with no price or liquidity is listed, but has no token to buy yet.
  price?: number
  liquidity?: number
  theme?: StockTheme
  series?: number[]
  preIpo?: boolean
  // The share's change over the month, as a fraction, once it has been looked up
  monthChange?: number
  dayChange?: number
}

export type MarketSummary = {
  listed: number
  buyable: number
  themeCounts: Partial<Record<StockTheme, number>>
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
  // Oldest first, one point a day, so a range is the tail of the series
  tokenSeries: number[]
  shareSeries: number[]
  knowledge: Knowledge[]
  // Missing until there is enough history to measure
  risk?: { beta: number; worstDrop: number }
}

export type StockCategory = { id: string; label: string; symbols: string[]; unavailable?: string[] }
