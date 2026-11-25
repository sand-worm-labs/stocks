import { QUOTE_URL } from "@/constants/markets"

import { ResearchFailure } from "./failure"

// Daily closing prices, the same days for every ticker, oldest first
export type DailyPrices = { dates: string[]; closes: Record<string, number[]> }

type Fetch = typeof fetch

const MIN_DAYS = 200
export const BENCHMARK = "SPY"

// A token is priced to follow its share, so the share's history is the token's: AMZNc follows AMZN
export const shareOf = (symbol: string) => symbol.replace(/c$/, "").replace(".", "-")

async function closesOf(ticker: string, years: number, send: Fetch) {
  const reply = await send(`${QUOTE_URL}/${encodeURIComponent(ticker)}?range=${years}y&interval=1d`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!reply.ok) throw new ResearchFailure(`No price history for ${ticker} (Yahoo answered ${reply.status})`)
  const body = (await reply.json()) as {
    chart?: { result?: { timestamp?: number[]; indicators: { quote: { close: (number | null)[] }[] } }[] }
  }
  const result = body.chart?.result?.[0]
  const closes = result?.indicators.quote[0]?.close ?? []
  const byDate = new Map<string, number>()
  result?.timestamp?.forEach((time, i) => {
    const close = closes[i]
    if (close != null && close > 0) byDate.set(new Date(time * 1000).toISOString().slice(0, 10), close)
  })
  if (byDate.size < MIN_DAYS) throw new ResearchFailure(`${ticker} has too little price history to test (${byDate.size} days)`)
  return byDate
}

// Real daily prices for the stocks and the S&P 500 (as SPY) over the same days. A day any of them has no price for is left out of all, so
// every line in the test is looked at on the same days.
export async function getDailyPrices(tickers: string[], years = 3, send: Fetch = fetch): Promise<DailyPrices> {
  const wanted = [...new Set([...tickers, BENCHMARK])]
  const series = await Promise.all(wanted.map((ticker) => closesOf(ticker, years, send)))

  const dates = [...series[0]!.keys()].filter((date) => series.every((one) => one.has(date))).sort()
  if (dates.length < MIN_DAYS) throw new ResearchFailure("The stocks have too few days of prices in common to test")

  const closes = Object.fromEntries(wanted.map((ticker, i) => [ticker, dates.map((date) => Math.round(series[i]!.get(date)! * 100) / 100)]))
  return { dates, closes }
}
