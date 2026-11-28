// What a pool's price and liquidity say, in the token it trades the stock against.
export type PoolReading = { sqrtPriceX96: bigint; liquidity: bigint }

export type PoolSides = { isStockToken0: boolean; stockDecimals: number; quoteDecimals: number }

export type Depth = {
  // What one share costs, in the quote token
  priceInQuote: number
  // How much the pool holds across the price range it is trading in, counted twice (both sides are worth the same at the price): this decides how far a
  // trade moves the price, which is what the mirror needs. It is not the pool's whole balance, and a v4 pool has no balance of its own to count.
  depthInQuote: number
}

// Uniswap v3, Slipstream and v4 all keep the price as a square root times 2^96 and the depth as one number L, so one formula reads them all.
export function depthOf({ sqrtPriceX96, liquidity }: PoolReading, { isStockToken0, stockDecimals, quoteDecimals }: PoolSides): Depth | undefined {
  if (sqrtPriceX96 === 0n) return undefined

  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96
  const decimalShift = 10 ** (stockDecimals - quoteDecimals)
  const quoteUnits = 10 ** quoteDecimals

  // Token1 per token0, in the smallest units of each. In the range the pool trades in it holds L / sqrt(price) of token0 and L * sqrt(price) of token1.
  const priceInQuote = isStockToken0 ? sqrtPrice * sqrtPrice * decimalShift : decimalShift / (sqrtPrice * sqrtPrice)
  const quoteHeld = isStockToken0 ? Number(liquidity) * sqrtPrice : Number(liquidity) / sqrtPrice
  return { priceInQuote, depthInQuote: (2 * quoteHeld) / quoteUnits }
}
