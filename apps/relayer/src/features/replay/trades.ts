import type { Address } from "viem"
import type { Swap } from "../../infrastructure/base-mainnet/read-swaps.js"

// What the market maker does in one pool in one direction: all the swaps that went that way, as one trade of their sum
export type Trade = { pool: Address; isToken0In: boolean; amountIn: bigint }

// A few blocks of swaps become a few trades, so the maker sends a transaction for each pool and direction and not for each swap. The copy is priced
// from the mirror and not from its own trades, so one big trade and many small ones leave it in the same place.
export function aggregateSwaps(swaps: Swap[]): Trade[] {
  const trades = new Map<string, Trade>()
  for (const { pool, isToken0In, amountIn } of swaps) {
    const key = `${pool}:${isToken0In}`
    const trade = trades.get(key)
    if (trade) trade.amountIn += amountIn
    else trades.set(key, { pool, isToken0In, amountIn })
  }
  return [...trades.values()]
}
