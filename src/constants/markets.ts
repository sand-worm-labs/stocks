export const STOCK_THEME_LABEL = { robotics: "Robotics" } as const

export type StockTheme = keyof typeof STOCK_THEME_LABEL

// The market data feed a share's price and change come from
export const QUOTE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

// Where the tokenized stocks, their prices and the chain each one lives on come from
export const COINGECKO_URL = "https://api.coingecko.com/api/v3"

// Where each token's live price comes from: the pools it trades in
export const DEXSCREENER_URL = "https://api.dexscreener.com/tokens/v1/base"

// The chart of a pool, as a page made to sit inside another. It opens on one-minute candles.
export const POOL_CHART_URL = "https://dexscreener.com/base"
export const POOL_CHART_INTERVAL = "1"

// A node on Base to read contracts from
export const BASE_RPC_URL = "https://base-rpc.publicnode.com"

// A node on Base that pushes each swap as it happens
export const BASE_WS_URL = "wss://base-rpc.publicnode.com"

export const MARKET_PAGE_SIZE = 25
