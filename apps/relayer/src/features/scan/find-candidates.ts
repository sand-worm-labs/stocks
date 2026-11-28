import type { Address } from "viem"
import type { Creation } from "../../infrastructure/base-mainnet/exchanges.js"

// A pool a stock trades in, and what it trades against
export type Candidate = {
  stock: Address
  quote: Address
  isStockToken0: boolean
  creation: Creation
}

// The pools made on the exchanges that hold one of the stocks. `stocks` holds lowercase addresses; a pool of two stocks is a candidate for both.
export function findCandidates(creations: Creation[], stocks: Set<Address>): Candidate[] {
  const candidates: Candidate[] = []
  for (const creation of creations) {
    const token0 = lowercase(creation.token0)
    const token1 = lowercase(creation.token1)
    if (stocks.has(token0)) candidates.push({ stock: token0, quote: token1, isStockToken0: true, creation })
    if (stocks.has(token1)) candidates.push({ stock: token1, quote: token0, isStockToken0: false, creation })
  }
  return candidates
}

export function lowercase(address: Address): Address {
  return address.toLowerCase() as Address
}
