import type { Stock } from "@/types/markets"

export const isBuyable = (stock: Stock) => stock.liquidity !== undefined

// A tokenized symbol is its share's ticker plus a lowercase "c" (AAPLc)
export const underlyingTicker = (symbol: string) => symbol.replace(/c$/, "")

// Temporary: a free logo host, until the token registry carries each issuer's own logo
export const stockLogoUrl = (symbol: string) =>
  `https://financialmodelingprep.com/image-stock/${underlyingTicker(symbol)}.png`
