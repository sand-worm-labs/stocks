import { zeroAddress, type Address } from "viem"
import { copyPoolAbi, poolFactoryAbi } from "../../infrastructure/base-sepolia/testnet.abis.js"
import type { Testnet } from "../../infrastructure/base-sepolia/testnet-clients.js"

// A copy of a mainnet pool on the test network: which tokens it holds, in the mainnet pool's order, and the spacing the router finds it by
export type Copy = { token0: Address; token1: Address; tickSpacing: number }

// What is known of each copy. A copy never changes, so it is read once; a pool with no copy yet is asked about again, because `provision` may make one.
export type Copies = Map<Address, Copy>

// The copy of a mainnet pool (by its key in the mirror), or nothing when there is none
export async function readCopy(chain: Testnet, factory: Address, pool: Address, known: Copies): Promise<Copy | undefined> {
  const kept = known.get(pool)
  if (kept) return kept

  const address = await chain.testnet.readContract({ address: factory, abi: poolFactoryAbi, functionName: "copyOf", args: [pool] })
  if (address === zeroAddress) return undefined

  const abi = copyPoolAbi
  const [token0, token1, tickSpacing] = await Promise.all([
    chain.testnet.readContract({ address, abi, functionName: "token0" }),
    chain.testnet.readContract({ address, abi, functionName: "token1" }),
    chain.testnet.readContract({ address, abi, functionName: "tickSpacing" }),
  ])
  const copy = { token0, token1, tickSpacing }
  known.set(pool, copy)
  return copy
}
