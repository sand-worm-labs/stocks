import type { PoolQuote } from "./pools"
import type { Swap } from "./swaps"

export type MarketEvent =
  | { type: "snapshot"; pools: PoolQuote[]; swaps: Swap[] }
  | { type: "pools"; pools: PoolQuote[] }
  | { type: "swaps"; swaps: Swap[] }
