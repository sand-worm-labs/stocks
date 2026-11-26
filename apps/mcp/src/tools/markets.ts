import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { addTool, path } from "../tool"
import type { Api } from "../api"

type Stock = { isBuyable?: boolean; theme?: string }

// The markets pages: which stocks there are, what each costs and how easily it can be bought, and one stock in full.
export function addMarketTools(server: McpServer, api: Api) {
  addTool(
    server,
    "list_stocks",
    "The stocks on offer, with price, how much of it can be bought at once (liquidity) and how it moved over the day and the month. A stock with no price has no token to buy yet. buyableOnly drops those.",
    { buyableOnly: z.boolean().optional(), theme: z.string().max(40).optional() },
    async ({ buyableOnly, theme }) => {
      const stocks = (await api.get("/markets/stocks")) as Stock[]
      return stocks.filter((stock) => (buyableOnly ? stock.isBuyable : true)).filter((stock) => (theme ? stock.theme === theme : true))
    }
  )

  addTool(
    server,
    "get_stock",
    "One stock in full: who issues it, how it is owned, when it trades, its sources and what is known about it, and its price history. Only for a stock that can be bought.",
    { symbol: z.string().max(20) },
    ({ symbol }) => api.get(`/markets/stocks/${path(symbol)}`)
  )

  addTool(server, "get_market_summary", "How many stocks are listed and buyable, the themes they fall in, and the categories they are grouped into.", {}, () =>
    api.get("/markets/summary")
  )
}
