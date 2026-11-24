export const TOKEN_TABS = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "trades", label: "Trades" },
  { id: "community", label: "Community" },
  { id: "holders", label: "Holders" },
  { id: "transfers", label: "Transfers" },
  { id: "info", label: "Info" },
  { id: "contract", label: "Contract" },
  { id: "analytics", label: "Analytics" },
] as const

export type TokenTabId = (typeof TOKEN_TABS)[number]["id"]

export const DEFAULT_TOKEN_TAB: TokenTabId = "overview"

export const TOKEN_TABLE_PAGE_SIZE = 25

// How many of the strategies that hold a stock are listed on its page at once
export const EXPOSURES_PER_PAGE = 5
