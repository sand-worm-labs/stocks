import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { addMarketTools } from "./tools/markets"
import { addStrategyTools } from "./tools/strategies"
import { addTradingTools } from "./tools/trading"
import type { Web } from "./web"

// The tools an agent has on Sandworm Stocks, for one person: everything the app lets that person do, as them. Making and reading strategies,
// getting their research back, sharing a report, starting trading, moving money, selling, and looking at the markets. `parity.ts` lists the
// app's API calls and which tool does each, and a test fails when the app gains one that no tool does.
export function createServer(web: Web) {
  const server = new McpServer({ name: "sandworm-stocks", version: "0.1.0" })
  addStrategyTools(server, web)
  addTradingTools(server, web)
  addMarketTools(server, web)
  return server
}
