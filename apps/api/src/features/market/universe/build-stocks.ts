import { underlyingTicker } from "@/features/market/stock"
import type { Stock } from "@/features/market/types/market.types"
import type { PoolQuote } from "@/infrastructure/datasource/datasource.types"

import type { CompanyProfile, Listing } from "./universe.types"

// Below this a pool is a place to look at a price, not one to trade in
const MIN_POOL_LIQUIDITY = 1

type Inputs = {
  listings: Listing[]
  // By the token's contract, lowercase
  pools: Map<string, PoolQuote>
  // By the share's ticker
  profiles: Map<string, CompanyProfile>
}

// A stock in the universe: what the sources list, put together with how each token trades on Base and what company it is. One stock listed by
// two sources is one stock (the first to list it names it); a stock with no pool is listed but cannot be bought, and one the world has not
// listed on an exchange is pre-IPO.
export function buildStocks({ listings, pools, profiles }: Inputs): Stock[] {
  const byTicker = new Map<string, Stock>()

  for (const listing of listings) {
    const ticker = underlyingTicker(listing.symbol)
    const seen = byTicker.get(ticker)
    if (seen) {
      seen.sources = [...(seen.sources ?? []), listing.source]
      continue
    }
    byTicker.set(ticker, stockFrom(listing, pools.get(listing.address), profiles.get(ticker)))
  }
  return [...byTicker.values()]
}

function stockFrom(listing: Listing, pool: PoolQuote | undefined, profile: CompanyProfile | undefined): Stock {
  const hasPool = !!pool && (pool.liquidity ?? 0) >= MIN_POOL_LIQUIDITY
  return {
    symbol: listing.symbol,
    name: listing.name,
    address: listing.address,
    isin: listing.isin,
    description: shortDescription(listing.description),
    totalSupply: listing.totalSupply,
    firstMintDate: listing.firstMintDate,
    sources: [listing.source],
    price: hasPool ? pool.price : listing.navPrice,
    liquidity: hasPool ? pool.liquidity : undefined,
    pool: hasPool ? { address: pool.pair, dex: pool.dex, version: pool.version, quote: pool.quote } : undefined,
    // The feed gives percent; the app keeps fractions
    dayChange: hasPool && pool.change24h !== undefined ? pool.change24h / 100 : undefined,
    sector: profile?.sector,
    industry: profile?.industry,
    preIpo: profile && !profile.isListed ? true : undefined,
  }
}

// A token's description starts with a line of boilerplate about what a tokenized stock is; the part about the company is what is worth keeping
function shortDescription(description: string | undefined) {
  if (!description) return undefined
  const [, about = description] = description.split(/\n\n/, 2)
  return about.split(/\n\n/)[0]?.slice(0, 400)
}
