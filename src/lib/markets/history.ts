import { z } from "zod"

import { COINGECKO_URL, QUOTE_URL } from "@/constants/markets"

import { coingeckoHeaders } from "./tokens"

// A price at a moment, `time` in seconds, oldest first in a list
export type PricePoint = { time: number; price: number }

// How far back to ask for. Prices come in finer steps the shorter the stretch, and the same few stretches are asked for by everyone, so
// what is fetched is shared and kept for a few minutes instead of asked for again by each page.
export type HistoryWindow = "day" | "week" | "month"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export const windowFor = (sinceMs: number, nowMs: number): HistoryWindow => {
  const age = nowMs - sinceMs
  return age <= 22 * HOUR_MS ? "day" : age <= 6 * DAY_MS ? "week" : "month"
}

const COINGECKO_DAYS = { day: 1, week: 7, month: 30 } as const
const YAHOO = { day: ["1d", "5m"], week: ["5d", "15m"], month: ["1mo", "1h"] } as const

const KEPT_FOR_SECONDS = 300
const TIMEOUT_MS = 15_000

const tokenSchema = z.object({ prices: z.array(z.tuple([z.number(), z.number()])) })
const fundSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()) })) }),
        })
      )
      .nonempty(),
  }),
})

export async function getTokenHistory(tokenId: string, window: HistoryWindow): Promise<PricePoint[]> {
  try {
    const url = `${COINGECKO_URL}/coins/${encodeURIComponent(tokenId)}/market_chart?vs_currency=usd&days=${COINGECKO_DAYS[window]}`
    const response = await fetch(url, {
      headers: coingeckoHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: KEPT_FOR_SECONDS },
    })
    if (!response.ok) return []
    return tokenSchema
      .parse(await response.json())
      .prices.map(([ms, price]) => ({ time: Math.floor(ms / 1000), price }))
      .sort((a, b) => a.time - b.time)
  } catch {
    return []
  }
}

export async function getFundHistory(ticker: string, window: HistoryWindow): Promise<PricePoint[]> {
  try {
    const [range, interval] = YAHOO[window]
    const response = await fetch(`${QUOTE_URL}/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: KEPT_FOR_SECONDS },
    })
    if (!response.ok) return []
    const [{ timestamp = [], indicators }] = fundSchema.parse(await response.json()).chart.result
    const closes = indicators.quote[0]?.close ?? []
    return timestamp.flatMap((time, i) => {
      const close = closes[i]
      return close == null ? [] : [{ time, price: close }]
    })
  } catch {
    return []
  }
}
