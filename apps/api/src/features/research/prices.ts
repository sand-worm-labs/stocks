import { ResearchFailure } from "./research-failure"

// Daily closing prices, the same days for every ticker, oldest first
export type DailyPrices = { dates: string[]; closes: Record<string, number[]> }

export type GetDailyPrices = (tickers: string[], years?: number) => Promise<DailyPrices>

export const BENCHMARK = "SPY"

// A token is priced to follow its share, so the share's history is the token's: AMZNc follows AMZN
export const shareOf = (symbol: string) => symbol.replace(/c$/, "").replace(".", "-")

// The producers are given where prices come from (the market feature); without it, research says so instead of guessing
export const getDailyPrices: GetDailyPrices = async () => {
  throw new ResearchFailure("Prices aren't available")
}
