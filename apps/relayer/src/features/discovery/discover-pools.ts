import { readStocks, type StocksApi } from "../../infrastructure/stocks-api/stocks-api.js"
import { choosePools, type Chosen } from "./choose-pools.js"

// The pools the relayer can mirror, from the stocks the Stocks API offers and the deepest pool it found for each
export async function discoverPools(api: StocksApi, send: typeof fetch = fetch): Promise<Chosen> {
  return choosePools(await readStocks(api, send))
}
