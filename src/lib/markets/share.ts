import type { BaseToken } from "./tokens"

// Companies that aren't listed on any exchange yet, so TradingView has no chart for them
const PRE_IPO_TICKERS = ["ANT", "SPCX"]

// The ticker of the share a token tracks, where it can be told from the token. Coinbase's tokens are the ticker with a
// c after it, and Dinari's are the ticker itself.
export function tickerOf({ issuer, symbol }: BaseToken) {
  return issuer === "Coinbase" ? symbol.slice(0, -1) : issuer === "Dinari" ? symbol : undefined
}

export function shareTicker(token: BaseToken) {
  const ticker = tickerOf(token)
  return ticker && !PRE_IPO_TICKERS.includes(ticker) ? ticker : undefined
}
