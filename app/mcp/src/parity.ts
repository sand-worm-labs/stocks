// Every call the app's API has, and the tool that does it for an agent. A call of the app's that is not here makes `parity.test.ts` fail, so
// the app can't gain something a person can do that an agent can't. A call an agent can't make is listed in `NOT_FOR_AGENTS`, with why.
export const TOOL_FOR = {
  "GET /api/strategies": "list_strategies",
  "POST /api/strategies": "create_strategy",
  "GET /api/strategies/research": "list_strategies",
  "GET /api/strategies/waiting": "list_research_requests",
  "GET /api/strategies/[id]": "get_report",
  "PATCH /api/strategies/[id]": "rename_strategy",
  "GET /api/strategies/[id]/brief": "get_strategy",
  "POST /api/strategies/[id]/confirm": "confirm_rules",
  "POST /api/strategies/[id]/ready": "check_research",
  "POST /api/strategies/[id]/retry": "retry_research",
  "POST /api/strategies/[id]/research": "submit_research",
  "POST /api/strategies/[id]/share": "share_report",
  "POST /api/strategies/[id]/trade": "start_trading",
  "POST /api/strategies/[id]/funds": "change_funds",
  "POST /api/strategies/[id]/sell": "sell",
  "GET /api/strategies/[id]/activity": "get_activity",
  "GET /api/activity": "get_activity",
  "GET /api/markets/stocks": "list_stocks",
  "GET /api/markets/stocks/[symbol]": "get_stock",
  "GET /api/markets/summary": "get_market_summary",
} as const

export const NOT_FOR_AGENTS = {
  "GET /api/health": "The app's own health check",
  "POST /api/auth/session": "Signing in is a person's wallet signature in a browser; an agent comes in with its token",
  "POST /api/auth/logout": "Ends a browser's sign-in; an agent has none",
  "GET /api/chat/ticket": "A ticket for the browser's live chat connection, which is a screen and not an action",
} as const
