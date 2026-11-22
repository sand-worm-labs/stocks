import type { Stock } from "./types"

export const byLiquidity = (a: Stock, b: Stock) => (b.liquidity ?? 0) - (a.liquidity ?? 0)
