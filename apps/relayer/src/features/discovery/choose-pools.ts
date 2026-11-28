import type { Address, Hex } from "viem"
import { isAddress, isBytes32 } from "../../common/hex.schema.js"
import { mirrorKeyOf } from "../../common/pool-key.js"
import type { Pool, PoolDetail, PoolKind } from "../../common/pool.type.js"
import type { ApiStock } from "../../infrastructure/stocks-api/stocks-api.js"

export type Chosen = { pools: Pool[]; skipped: string[] }

// A stock the API knows the token, the pool and the price of: the one pool it trades in, deepest first, as the API found it
type PricedStock = ApiStock & { address: string; price: number; pool: NonNullable<ApiStock["pool"]> }

// The exchanges whose pools the relayer can read: slot0() on a v3 or Slipstream contract, and StateView for a v4 pool id.
// DexScreener, which the API asks, names Aerodrome's concentrated pools both "aero" and "aerodrome".
export function kindOf(dex: string, version: string | undefined): PoolKind | undefined {
  if (dex === "uniswap" && version === "v3") return "uniswap-v3"
  if (dex === "uniswap" && version === "v4") return "uniswap-v4"
  if (dex === "aero" || dex === "aerodrome") return "aerodrome-cl"
  return undefined
}

// The API's addresses are hex strings; the cast only adds the template type. Callers have checked the shape.
function asAddress(address: string): Address {
  return address as Address
}

function isPriced(stock: ApiStock): stock is PricedStock {
  return !!stock.address && !!stock.pool && !!stock.price
}

function detailOf(stock: PricedStock): PoolDetail {
  return {
    stock: asAddress(stock.address.toLowerCase()),
    quote: asAddress(stock.pool.quote.toLowerCase()),
    liquidityUsd: stock.liquidity ?? 0,
    priceUsd: stock.price,
  }
}

// A pool's address is a contract's, or for a v4 pool its 32-byte id
function isReadable(kind: PoolKind, pool: string): boolean {
  return kind === "uniswap-v4" ? isBytes32(pool) : isAddress(pool)
}

function poolOf(stock: PricedStock, kind: PoolKind): Pool {
  const detail = detailOf(stock)
  if (kind === "uniswap-v4") {
    const poolId = stock.pool.address as Hex
    return { name: stock.symbol, address: mirrorKeyOf(poolId), kind, poolId, detail }
  }
  return { name: stock.symbol, address: asAddress(stock.pool.address), kind, detail }
}

// "AAPLc (uniswap v4)": says which exchange the relayer could not read
function skippedLabel(stock: PricedStock): string {
  const { dex, version } = stock.pool
  return `${stock.symbol} (${version ? `${dex} ${version}` : dex})`
}

// The pools the relayer can mirror, one per stock, and the stocks whose pool it cannot read yet
export function choosePools(stocks: ApiStock[]): Chosen {
  const pools: Pool[] = []
  const skipped: string[] = []

  for (const stock of stocks.filter(isPriced)) {
    const kind = kindOf(stock.pool.dex, stock.pool.version)
    if (!kind || !isReadable(kind, stock.pool.address)) {
      skipped.push(skippedLabel(stock))
      continue
    }
    pools.push(poolOf(stock, kind))
  }
  return { pools, skipped }
}
