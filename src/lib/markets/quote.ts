import { z } from "zod"

import { QUOTE_URL } from "@/constants/markets"

import { underlyingTicker } from "./stock"

// Oldest first, one close a day
export type Quote = { price: number; name?: string; monthChange?: number; dayChange?: number; series: number[] }

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({ regularMarketPrice: z.number(), longName: z.string().optional() }),
          indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()) })) }),
        })
      )
      .nonempty(),
  }),
})

// A share's latest price and its change over the month, from the market data feed. Nothing comes back if the feed
// doesn't know the ticker or can't be reached, so the caller keeps what it had.
async function getQuote(ticker: string): Promise<Quote | undefined> {
  try {
    const response = await fetch(`${QUOTE_URL}/${encodeURIComponent(ticker)}?range=1mo&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    })
    if (!response.ok) return undefined

    const [{ meta, indicators }] = chartSchema.parse(await response.json()).chart.result
    const closes = indicators.quote[0]?.close.filter((close): close is number => close !== null) ?? []

    const { regularMarketPrice: price } = meta
    const yesterday = closes.at(-2)

    return {
      price,
      name: meta.longName,
      monthChange: closes[0] ? price / closes[0] - 1 : undefined,
      dayChange: yesterday ? price / yesterday - 1 : undefined,
      series: closes,
    }
  } catch {
    return undefined
  }
}

export async function getQuotes(symbols: string[]) {
  const tickers = Array.from(new Set(symbols.map(underlyingTicker)))
  const quotes = await Promise.all(tickers.map(getQuote))

  return new Map(tickers.flatMap((ticker, i) => (quotes[i] ? [[ticker, quotes[i]] as const] : [])))
}
