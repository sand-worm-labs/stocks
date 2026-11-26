import { fromMarket } from "@/lib/api/market"

// A price at a moment, `time` in seconds, oldest first in a list
export type PricePoint = { time: number; price: number }

// How far back to ask for. Prices come in finer steps the shorter the stretch, and the same few stretches are asked for by everyone, so
// they are shared and kept for a few minutes by the API instead of asked for again by each page.
export type HistoryWindow = "day" | "week" | "month"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export const windowFor = (sinceMs: number, nowMs: number): HistoryWindow => {
  const age = nowMs - sinceMs
  return age <= 22 * HOUR_MS ? "day" : age <= 6 * DAY_MS ? "week" : "month"
}

export const getTokenHistory = (tokenId: string, window: HistoryWindow) =>
  fromMarket<PricePoint[]>(`/market/tokens/${encodeURIComponent(tokenId)}/history?window=${window}`, [])

export const getFundHistory = (ticker: string, window: HistoryWindow) =>
  fromMarket<PricePoint[]>(`/market/funds/${encodeURIComponent(ticker)}/history?window=${window}`, [])
