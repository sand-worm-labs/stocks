import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { addTool, path } from "../tool"
import type { Api } from "../api"

const strategyId = z.string()

// What a person does once a strategy is ready: start it, put money in or take it out, sell. Starting with a wallet rests on a signature from
// the person's own wallet, which the app checks on the chain; an agent can pass one the person has made but can't make one, so nothing here
// lets it spend money the person hasn't approved. Funds and sales are paper trading only, and the app refuses them for anything else.
export function addTradingTools(server: McpServer, api: Api) {
  addTool(
    server,
    "start_trading",
    [
      "Start a ready strategy trading. mode 'paper' moves no money.",
      "mode 'live' trades the person's own USDC from their wallet, and needs the wallet's address, an expiry and the signature of the approval the person signed in the app for up to this amount; without them it is refused.",
    ].join(" "),
    {
      strategyId,
      mode: z.enum(["paper", "live"]),
      amount: z.number().positive().finite(),
      address: z.string().optional(),
      expires: z.string().optional(),
      signature: z.string().optional(),
    },
    ({ strategyId: id, ...trade }) => api.post(`/strategies/${path(id)}/trade`, trade)
  )

  addTool(
    server,
    "change_funds",
    "Put paper money into a strategy that is trading (it is spread over the stocks that have room) or take cash out of it. Up to 100,000 USDC at a time.",
    { strategyId, direction: z.enum(["add", "remove"]), amount: z.number().positive().max(100_000) },
    ({ strategyId: id, ...funds }) => api.post(`/strategies/${path(id)}/funds`, funds)
  )

  addTool(
    server,
    "sell",
    "Sell a share of a trading strategy's stocks at today's price. share is above 0 and up to 1 (1 is all of it). Name symbols to sell only those, or leave them out to sell from everything it holds.",
    { strategyId, symbols: z.array(z.string().max(20)).max(50).optional(), share: z.number().gt(0).max(1) },
    ({ strategyId: id, ...sale }) => api.post(`/strategies/${path(id)}/sell`, sale)
  )
}
