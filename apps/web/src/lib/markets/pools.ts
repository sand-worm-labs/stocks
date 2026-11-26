import { fromMarket, inParts, listOf, shared } from "@/lib/api/market"

// What a token's deepest pool on Base says right now. Changes are in percent, as the feed gives them.
export type PoolQuote = {
  // The token's contract, lowercase
  address: string
  pair: string
  quote: string
  price: number
  change5m?: number
  change1h?: number
  change24h?: number
  volume24h?: number
  liquidity?: number
}

const ADDRESSES_PER_CALL = 100
const KEPT_MS = 10_000

const poolsOf = shared<PoolQuote>(KEPT_MS, (addresses) =>
  inParts(addresses.split(","), ADDRESSES_PER_CALL, (part) => fromMarket<PoolQuote[]>(`/market/pools?addresses=${listOf(part)}`, []))
)

// Each token's deepest pool on Base, as it stands
export const getAllPoolQuotes = (addresses: string[]): Promise<PoolQuote[]> =>
  addresses.length ? poolsOf(addresses.join(",")) : Promise.resolve([])
