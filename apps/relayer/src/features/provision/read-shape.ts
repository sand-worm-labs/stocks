import type { Address, Hex, PublicClient } from "viem"
import type { Pool } from "../../common/pool.type.js"
import { UNISWAP_V4_STATE_VIEW } from "../../infrastructure/base-mainnet/base-mainnet.constants.js"
import { mainnetShapeAbi, uniswapV4StateViewAbi } from "../../infrastructure/base-mainnet/mainnet.abis.js"
import type { Shape } from "./plan.js"
import { findTickSpacing, inAddressOrder } from "./v4-key.js"

export type Shaped = { shape: Shape } | { skipped: string }

// What a mainnet pool is made of, which the copy has to match. A reason when the pool does not answer, so one broken pool does not stop the rest.
export async function readShape(client: PublicClient, pool: Pool): Promise<Shaped> {
  try {
    if (pool.kind === "uniswap-v4") return await readV4Shape(client, pool)
    return { shape: await readContractShape(client, pool.address) }
  } catch {
    return { skipped: `could not read ${pool.name} (${pool.address})` }
  }
}

// Uniswap v3 and Slipstream answer these themselves; `fee()` is in hundredths of a basis point
async function readContractShape(client: PublicClient, address: Address): Promise<Shape> {
  const abi = mainnetShapeAbi
  const [token0, token1, tickSpacing, fee] = await Promise.all([
    client.readContract({ address, abi, functionName: "token0" }),
    client.readContract({ address, abi, functionName: "token1" }),
    client.readContract({ address, abi, functionName: "tickSpacing" }),
    client.readContract({ address, abi, functionName: "fee" }),
  ])
  return { token0, token1, tickSpacing: Number(tickSpacing), fee: Number(fee) }
}

// A v4 pool says its fee through StateView; its tokens come from DexScreener, and its tick spacing from the id (see `findTickSpacing`)
async function readV4Shape(client: PublicClient, pool: Pool & { kind: "uniswap-v4"; poolId: Hex }): Promise<Shaped> {
  if (!pool.detail) return { skipped: `${pool.name}: nothing is known about the pool's tokens` }

  const [token0, token1] = inAddressOrder(pool.detail.stock, pool.detail.quote)
  const [, , , fee] = await client.readContract({
    address: UNISWAP_V4_STATE_VIEW,
    abi: uniswapV4StateViewAbi,
    functionName: "getSlot0",
    args: [pool.poolId],
  })

  const tickSpacing = findTickSpacing(pool.poolId, token0, token1, fee)
  if (tickSpacing === undefined) return { skipped: `${pool.name}: a v4 pool with hooks or a changing fee, whose tick spacing cannot be found` }
  return { shape: { token0, token1, tickSpacing, fee } }
}
