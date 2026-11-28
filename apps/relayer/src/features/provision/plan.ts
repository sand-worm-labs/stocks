import type { Address } from "viem"
import type { Pool } from "../../common/pool.type.js"
import { BASE_USDC, MIN_LIQUIDITY_USD, STOCK_DECIMALS, USDC_DECIMALS } from "./provision.constants.js"

// What the mainnet pool says about itself
export type Shape = { token0: Address; token1: Address; tickSpacing: number; fee: number }

// What to build on the test network for one mainnet pool
export type Plan = {
  symbol: string
  testSymbol: string
  testName: string
  mainnetPool: Address
  // The copy keeps the mainnet pool's token order, so the mirrored price means the same
  stockIsToken0: boolean
  tickSpacing: number
  feeBps: number
  usdcSeed: bigint
  stockSeed: bigint
}

export type Planned = { plan: Plan } | { skipped: string }

// The faucet takes letters and digits only, and 3 to 12 of them; "t" on the front says it is a test token
export function testSymbolOf(symbol: string): string {
  return `t${symbol.replace(/[^A-Za-z0-9]/g, "")}`
}

// Uniswap v3 and Slipstream give a pool's fee in hundredths of a basis point (500 is 0.05%)
export function feeBpsOf(fee: number): number {
  return Math.max(1, Math.round(fee / 100))
}

// Half the pool's dollar depth on each side, at the pool's price
export function seedAmounts(liquidityUsd: number, priceUsd: number): { usdc: bigint; stock: bigint } {
  const half = liquidityUsd / 2
  return { usdc: BigInt(Math.floor(half * USDC_DECIMALS)), stock: BigInt(Math.floor((half / priceUsd) * STOCK_DECIMALS)) }
}

export function planPool(pool: Pool, shape: Shape): Planned {
  const detail = pool.detail
  if (!detail) return { skipped: `${pool.name}: nothing is known about the pool's tokens` }
  if (detail.quote !== BASE_USDC) return { skipped: `${pool.name}: trades against ${detail.quote}, not USDC` }
  if (detail.liquidityUsd < MIN_LIQUIDITY_USD) return { skipped: `${pool.name}: only ${Math.round(detail.liquidityUsd)} dollars deep` }

  const sides = [shape.token0.toLowerCase(), shape.token1.toLowerCase()]
  const hasBothTokens = sides.includes(detail.stock) && sides.includes(detail.quote)
  if (!hasBothTokens) return { skipped: `${pool.name}: the pool's tokens are not the stock and USDC` }

  const seed = seedAmounts(detail.liquidityUsd, detail.priceUsd)
  const plan: Plan = {
    symbol: pool.name,
    testSymbol: testSymbolOf(pool.name),
    testName: `Test ${pool.name}`,
    mainnetPool: pool.address,
    stockIsToken0: sides[0] === detail.stock,
    tickSpacing: shape.tickSpacing,
    feeBps: feeBpsOf(shape.fee),
    usdcSeed: seed.usdc,
    stockSeed: seed.stock,
  }
  return { plan }
}
