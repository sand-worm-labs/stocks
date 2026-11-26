import { listOf } from "@/lib/api/market"
import { callStocksApiRaw, stocksApiUrl } from "@/lib/api/stocks-api"

import { ResearchFailure } from "./failure"

// Daily closing prices, the same days for every ticker, oldest first
export type DailyPrices = { dates: string[]; closes: Record<string, number[]> }

export const BENCHMARK = "SPY"

// A token is priced to follow its share, so the share's history is the token's: AMZNc follows AMZN
export const shareOf = (symbol: string) => symbol.replace(/c$/, "").replace(".", "-")

// The longest the API is given: it asks Yahoo for every ticker, three years each
const TIMEOUT_MS = 60_000

// Real daily prices for the stocks and the S&P 500 (as SPY) over the same days, from the Stocks API. When the API says why a stock can't be tested (too
// little history, no prices at all), that is what the person is told, since it is about their stock.
export async function getDailyPrices(tickers: string[], years = 3): Promise<DailyPrices> {
  if (!stocksApiUrl()) throw new ResearchFailure("Prices come from the Stocks API, which isn't set up")

  const response = await callStocksApiRaw(`/market/daily-prices?tickers=${listOf(tickers)}&years=${years}`, {}, TIMEOUT_MS).catch(() => undefined)
  if (!response) throw new ResearchFailure("The prices could not be reached. Try again in a moment")
  if (response.ok) return (await response.json()) as DailyPrices

  const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined
  throw new ResearchFailure(body?.message ?? `The prices could not be fetched (${response.status})`)
}
