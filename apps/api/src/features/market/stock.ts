import type { Stock } from "@/features/market/types/market.types"

export const isBuyable = (stock: Stock) => stock.liquidity !== undefined

// A tokenized symbol is its share's ticker plus a lowercase "c" (AAPLc)
export const underlyingTicker = (symbol: string) => symbol.replace(/c$/, "")
