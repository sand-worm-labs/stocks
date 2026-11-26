import { fromMarket, inParts, listOf } from "@/lib/api/market"

import { underlyingTicker } from "./stock"

// Oldest first, one close a day
type Quote = { price: number; name?: string; monthChange?: number; dayChange?: number; series: number[] }

const TICKERS_PER_CALL = 60

export async function getQuotes(symbols: string[]) {
  const tickers = Array.from(new Set(symbols.map(underlyingTicker)))
  const found = await inParts(tickers, TICKERS_PER_CALL, async (part) =>
    Object.entries(await fromMarket<Record<string, Quote>>(`/market/quotes?tickers=${listOf(part)}`, {}))
  )

  return new Map(found)
}
