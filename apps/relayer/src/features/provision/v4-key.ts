import { encodeAbiParameters, keccak256, zeroAddress, type Address, type Hex } from "viem"
import { MAX_TICK_SPACING } from "./provision.constants.js"

const poolKeyTypes = [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] as const

// A v4 pool's id is the hash of its key: both tokens (in address order), the fee, the tick spacing and the hooks contract.
export function poolIdOf(token0: Address, token1: Address, fee: number, tickSpacing: number, hooks: Address): Hex {
  return keccak256(encodeAbiParameters(poolKeyTypes, [token0, token1, fee, tickSpacing, hooks]))
}

// The pool manager does not store a pool's tick spacing where it can be read from the id, and a public RPC will not serve the Initialize event for it.
// So try every spacing, with no hooks and the fee the pool charges now, until the hash is the id. Nothing matches a pool with hooks or a dynamic fee.
export function findTickSpacing(poolId: Hex, token0: Address, token1: Address, fee: number): number | undefined {
  for (let tickSpacing = 1; tickSpacing <= MAX_TICK_SPACING; tickSpacing++) {
    if (poolIdOf(token0, token1, fee, tickSpacing, zeroAddress) === poolId) return tickSpacing
  }
  return undefined
}

// A v4 pool holds its two tokens in address order, whichever one DexScreener calls the base
export function inAddressOrder(a: Address, b: Address): [Address, Address] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a]
}
