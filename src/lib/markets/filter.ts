import type { Stock } from "@/types/markets"

export const byLiquidity = (a: Stock, b: Stock) => (b.liquidity ?? 0) - (a.liquidity ?? 0)
