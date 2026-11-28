import { z } from "zod"
import { STOCKS_API_TIMEOUT_MS } from "./stocks-api.constants.js"

// Where the Stocks API is, and the key it shares with the apps that call it for themselves (the web app's server, and this relayer)
export type StocksApi = { url: string; key: string }

// The part of a stock the relayer needs. The API finds every stock and its deepest pool on Base (apps/api, features/market/universe), so the
// relayer does not ask Coinbase or DexScreener itself.
const stocksSchema = z.array(
  z.object({
    symbol: z.string(),
    address: z.string().optional(),
    price: z.number().optional(),
    liquidity: z.number().optional(),
    pool: z.object({ address: z.string(), dex: z.string(), version: z.string().optional(), quote: z.string() }).optional(),
  }),
)

const symbolsSchema = z.array(z.string())

export type ApiStock = z.infer<typeof stocksSchema>[number]

// Every stock on offer, with its token and the deepest pool it trades in
export async function readStocks(api: StocksApi, send: typeof fetch = fetch): Promise<ApiStock[]> {
  return stocksSchema.parse(await get(api, "/market/stocks", send))
}

// The symbols that strategies hold or have held, so the relayer can keep their pools live first
export async function readHeldSymbols(api: StocksApi, send: typeof fetch = fetch): Promise<string[]> {
  return symbolsSchema.parse(await get(api, "/internal/strategies/held-symbols", send))
}

async function get(api: StocksApi, path: string, send: typeof fetch): Promise<unknown> {
  const response = await send(`${api.url}${path}`, {
    headers: { Authorization: `Bearer ${api.key}` },
    signal: AbortSignal.timeout(STOCKS_API_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`The Stocks API answered ${response.status} for ${path}`)
  return response.json()
}
